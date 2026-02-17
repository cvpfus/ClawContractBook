import { prisma } from '@clawcontractbook/database';
import { getSource } from '@clawcontractbook/s3-client';

const OPENROUTER_MODEL = process.env.CLAWCONTRACT_OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514';

const AUDIT_SYSTEM_PROMPT = `You are a smart contract security auditor. Analyze the given Solidity source code and determine if it is malicious or violates any of the following rules:

RULES:
1. Must NOT contain hidden backdoors (e.g. owner-only drain functions disguised with misleading names)
2. Must NOT contain honeypot patterns (e.g. preventing sells, hidden transfer fees, blacklist manipulation)
3. Must NOT contain rug-pull mechanisms (e.g. unlimited minting by owner, removable liquidity locks, self-destruct)
4. Must NOT contain phishing patterns (e.g. approve-to-attacker, delegatecall to untrusted addresses)
5. Must NOT contain obfuscated or intentionally misleading code
6. Must NOT contain hardcoded addresses that receive fees/funds without clear documentation
7. Must NOT disable or bypass standard safety checks (e.g. overriding transfer to steal funds)
8. Must NOT be a token contract (ERC-20, BEP-20, or any fungible token with name/symbol/supply/mint/burn — tokens are not allowed on this platform)

Respond with ONLY a JSON object (no markdown fences):
{"safe": true} if the contract passes all checks
{"safe": false, "reason": "<brief description of the violation>"} if the contract is malicious or violates rules`;

interface AuditResult {
  safe: boolean;
  reason?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
}

async function auditSourceCode(sourceCode: string, apiKey: string): Promise<AuditResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/clawcontract',
      'X-Title': 'ClawContractBook Verification Worker',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: AUDIT_SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this Solidity contract:\n\n${sourceCode}` },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenRouter');
  }

  const cleaned = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  const result = JSON.parse(cleaned) as AuditResult;
  return result;
}

export async function auditVerifiedDeployments(deploymentIds: string[]): Promise<{ audited: number; flagged: number }> {
  if (deploymentIds.length === 0) {
    return { audited: 0, flagged: 0 };
  }

  const apiKey = process.env['CLAWCONTRACT_OPENROUTER_API_KEY'];
  if (!apiKey) {
    console.log('[LLMAudit] Skipping: CLAWCONTRACT_OPENROUTER_API_KEY not set');
    return { audited: 0, flagged: 0 };
  }

  let flagged = 0;

  for (const id of deploymentIds) {
    const deployment = await prisma.deployment.findUnique({ where: { id } });
    if (!deployment || deployment.verificationStatus !== 'verified' || !deployment.sourceUrl) {
      continue;
    }

    try {
      const sourceCode = await getSource(deployment.chainKey, deployment.contractAddress);
      if (!sourceCode) {
        console.log(`[LLMAudit] No source code for ${id}, skipping`);
        continue;
      }

      console.log(`[LLMAudit] Auditing: ${id} (${deployment.contractName})`);
      const result = await auditSourceCode(sourceCode, apiKey);

      if (result.safe) {
        console.log(`[LLMAudit] SAFE: ${id}`);
      } else {
        console.log(`[LLMAudit] FLAGGED: ${id} - ${result.reason}`);
        await prisma.deployment.update({
          where: { id },
          data: {
            verificationStatus: 'failed',
            verificationError: `LLM audit failed: ${result.reason}`,
          },
        });
        flagged++;
      }
    } catch (error) {
      console.error(`[LLMAudit] Error auditing ${id}:`, error instanceof Error ? error.message : error);
    }
  }

  return { audited: deploymentIds.length, flagged };
}
