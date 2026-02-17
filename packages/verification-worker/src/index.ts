import path from 'node:path';
import { pathToFileURL } from 'node:url';
import './loadEnv.js';
import cron from 'node-cron';
import { prisma } from '@clawcontractbook/database';
import { verifyContract, verifyOnExplorer } from '@clawcontractbook/verifier';
import { getSource } from '@clawcontractbook/s3-client';
import { keccak256 } from 'ethers';
import type { ChainKey } from '@clawcontractbook/shared';
import { auditVerifiedDeployments } from './llmAudit.js';

const CRON_SCHEDULE = '* * * * *';
const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const VERIFICATION_TIMEOUT = 30000;

interface VerificationJobResult {
  deploymentId: string;
  success: boolean;
  errors: string[];
}

async function runVerificationJob(deploymentId: string): Promise<VerificationJobResult> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment) {
    return { deploymentId, success: false, errors: ['Deployment not found'] };
  }

  if (deployment.verificationStatus === 'verified') {
    return { deploymentId, success: true, errors: [] };
  }

  if (deployment.verificationStatus === 'failed' && deployment.verificationRetryCount >= MAX_RETRIES) {
    return { deploymentId, success: false, errors: ['Max retries exceeded'] };
  }

  try {
    if (!deployment.sourceUrl) {
      await markFailed(deploymentId, 'NO_SOURCE_CODE');
      return { deploymentId, success: false, errors: ['No source code available'] };
    }

    const sourceCode = await getSource(deployment.chainKey, deployment.contractAddress);
    
    if (!sourceCode) {
      await markFailed(deploymentId, 'SOURCE_CODE_NOT_FOUND');
      return { deploymentId, success: false, errors: ['Source code not found in storage'] };
    }

    const result = await verifyContract({
      contractAddress: deployment.contractAddress,
      chainKey: deployment.chainKey as ChainKey,
      sourceCode,
      contractName: deployment.contractName,
      timeout: VERIFICATION_TIMEOUT,
    });

    if (result.success && result.details?.onChainBytecode) {
      const onChainHash = keccak256(result.details.onChainBytecode);
      
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          contractBytecodeHash: onChainHash,
          verificationError: null,
        },
      });

      // Submit source code to BscScan/opBNBScan for explorer verification
      const bscscanApiKey = process.env['BSCSCAN_API_KEY'];
      if (bscscanApiKey) {
        try {
          const explorerResult = await verifyOnExplorer({
            contractAddress: deployment.contractAddress,
            chainKey: deployment.chainKey as ChainKey,
            sourceCode,
            contractName: deployment.contractName,
          }, bscscanApiKey);

          if (explorerResult.success) {
            console.log(`[VerificationWorker] Explorer verification succeeded: ${explorerResult.explorerUrl}`);
          } else {
            console.log(`[VerificationWorker] Explorer verification failed: ${explorerResult.message}`);
          }
        } catch (error) {
          console.log(`[VerificationWorker] Explorer verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { deploymentId, success: true, errors: result.errors };
    }

    const errorMessage = result.errors.join('; ') || 'Verification failed';
    await markFailed(deploymentId, errorMessage);

    return { deploymentId, success: false, errors: result.errors };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const currentRetry = deployment.verificationRetryCount || 0;
    
    if (currentRetry >= MAX_RETRIES - 1) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          verificationStatus: 'failed',
          verificationError: errorMessage,
          verificationRetryCount: currentRetry + 1,
        },
      });
    } else {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          verificationError: errorMessage,
          verificationRetryCount: currentRetry + 1,
        },
      });
    }

    return { deploymentId, success: false, errors: [errorMessage] };
  }
}

async function markFailed(deploymentId: string, error: string): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      verificationStatus: 'failed',
      verificationError: error,
    },
  });
}

async function processPendingVerifications(): Promise<VerificationJobResult[]> {
  const pending = await prisma.deployment.findMany({
    where: {
      verificationStatus: 'pending',
      sourceUrl: { not: null },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  const results: VerificationJobResult[] = [];
  
  for (const deployment of pending) {
    console.log(`[VerificationWorker] Processing: ${deployment.id}`);
    const result = await runVerificationJob(deployment.id);
    results.push(result);
  }

  // Run LLM audit on newly verified deployments
  const verifiedIds = results.filter(r => r.success).map(r => r.deploymentId);
  const auditResult = await auditVerifiedDeployments(verifiedIds);
  if (auditResult.audited > 0) {
    console.log(`[VerificationWorker] LLM audit: ${auditResult.audited} audited, ${auditResult.flagged} flagged`);
  }

  return results;
}

let isRunning = false;

async function runScheduler(): Promise<void> {
  if (isRunning) return;
  
  isRunning = true;
  const startTime = Date.now();
  console.log('[VerificationWorker] Running verification cycle...');
  
  try {
    const results = await processPendingVerifications();
    const verified = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const duration = Date.now() - startTime;
    
    console.log(`[VerificationWorker] Completed in ${duration}ms - Verified: ${verified}, Failed: ${failed}`);
  } catch (error) {
    console.error('[VerificationWorker] Error:', error);
  } finally {
    isRunning = false;
  }
}

export function startScheduler(): void {
  console.log(`[VerificationWorker] Starting scheduler: ${CRON_SCHEDULE}`);
  
  cron.schedule(CRON_SCHEDULE, async () => {
    await runScheduler();
  });

  console.log('[VerificationWorker] Scheduler started');
}

export function stopScheduler(): void {
  console.log('[VerificationWorker] Stopping scheduler...');
}

// Robust main-module check (Windows path formats differ from import.meta.url)
const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  console.log('[VerificationWorker] Starting...');
  startScheduler();
}
