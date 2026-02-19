import { SUPPORTED_CHAINS, type ChainKey } from '@clawcontractbook/shared';

export interface SubmitVerificationOptions {
  contractAddress: string;
  sourceCode: string;
  contractName: string;
  chainKey: ChainKey;
  constructorArgs?: string;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  codeFormat?: string;
}

export interface ExplorerVerifyResult {
  success: boolean;
  message: string;
  explorerUrl: string;
}

interface ExplorerApiResponse {
  status: string;
  message: string;
  result: string;
}

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api';
const DEFAULT_COMPILER_VERSION = 'v0.8.20+commit.a1b79de6';
const DEFAULT_RUNS = 200;
const MAX_RETRIES = 5;
const INITIAL_POLL_INTERVAL_MS = 5_000;

const SUBMIT_MAX_RETRIES = 5;
const SUBMIT_INITIAL_DELAY_MS = 5_000;

export async function submitVerification(
  options: SubmitVerificationOptions,
  apiKey: string,
): Promise<string> {
  const chain = SUPPORTED_CHAINS[options.chainKey];

  const params = new URLSearchParams({
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: options.contractAddress,
    sourceCode: options.sourceCode,
    codeformat: options.codeFormat ?? 'solidity-single-file',
    contractname: options.contractName,
    compilerversion: options.compilerVersion ?? DEFAULT_COMPILER_VERSION,
    optimizationUsed: options.optimizationUsed === false ? '0' : '1',
    runs: String(options.runs ?? DEFAULT_RUNS),
    apikey: apiKey,
  });

  if (options.constructorArgs) {
    params.set('constructorArguements', options.constructorArgs);
  }

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chain.chainId}`;

  let delay = SUBMIT_INITIAL_DELAY_MS;
  for (let attempt = 0; attempt <= SUBMIT_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(delay);
      delay = Math.min(delay * 2, 30_000);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await response.json()) as ExplorerApiResponse;

    if (data.status === '1') {
      return data.result;
    }

    const isNotIndexed = data.result?.includes('Unable to locate ContractCode');
    if (isNotIndexed && attempt < SUBMIT_MAX_RETRIES) {
      continue;
    }

    throw new Error(`Verification submission failed: ${data.result}`);
  }

  throw new Error('Verification submission failed after maximum retries');
}

export async function checkVerificationStatus(
  guid: string,
  chainKey: ChainKey,
  apiKey: string,
): Promise<{ success: boolean; message: string }> {
  const chain = SUPPORTED_CHAINS[chainKey];

  const params = new URLSearchParams({
    module: 'contract',
    action: 'checkverifystatus',
    guid,
    apikey: apiKey,
  });

  const url = `${ETHERSCAN_V2_BASE}?chainid=${chain.chainId}&${params.toString()}`;
  const response = await fetch(url);
  const data = (await response.json()) as ExplorerApiResponse;

  if (data.result === 'Pending in queue') {
    return { success: false, message: data.result };
  }

  if (data.status === '1') {
    return { success: true, message: data.result };
  }

  return { success: false, message: data.result };
}

export async function pollVerificationStatus(
  guid: string,
  chainKey: ChainKey,
  apiKey: string,
): Promise<{ success: boolean; message: string }> {
  let delay = INITIAL_POLL_INTERVAL_MS;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await sleep(delay);

    const result = await checkVerificationStatus(guid, chainKey, apiKey);
    if (result.success || (result.message !== 'Pending in queue')) {
      return result;
    }

    delay = Math.min(delay * 2, 30_000);
  }

  return { success: false, message: 'Verification timed out after maximum retries' };
}

/**
 * Options for explorer verification. Matches ClawContract's VerifyOptions exactly.
 */
export interface VerifyOnExplorerOptions {
  contractAddress: string;
  chainKey: ChainKey;
  constructorArgs?: string;
  sourceCode?: string;
  contractName?: string;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  standardJsonInput?: unknown;
  solcLongVersion?: string;
  fullyQualifiedName?: string;
}

/**
 * Submit source code to BscScan/opBNBScan for verification and poll for result.
 * Uses the exact same submitVerification payload logic as ClawContract.
 */
export async function verifyOnExplorer(
  options: VerifyOnExplorerOptions,
  apiKey: string,
): Promise<ExplorerVerifyResult> {
  const chain = SUPPORTED_CHAINS[options.chainKey];

  const useStandardJson = !!options.standardJsonInput;

  const guid = await submitVerification(
    {
      contractAddress: options.contractAddress,
      sourceCode: useStandardJson
        ? JSON.stringify(options.standardJsonInput)
        : options.sourceCode ?? '',
      contractName: useStandardJson
        ? (options.fullyQualifiedName ?? options.contractName ?? '')
        : (options.contractName ?? ''),
      chainKey: options.chainKey,
      constructorArgs: options.constructorArgs,
      compilerVersion: useStandardJson
        ? (options.solcLongVersion ? `v${options.solcLongVersion}` : options.compilerVersion)
        : options.compilerVersion,
      optimizationUsed: options.optimizationUsed,
      runs: options.runs,
      codeFormat: useStandardJson ? 'solidity-standard-json-input' : 'solidity-single-file',
    },
    apiKey,
  );

  const result = await pollVerificationStatus(guid, options.chainKey, apiKey);

  return {
    success: result.success,
    message: result.message,
    explorerUrl: `${chain.explorerUrl}/address/${options.contractAddress}#code`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
