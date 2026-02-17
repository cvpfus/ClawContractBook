export { compileSource, type CompileResult, type CompileOptions } from './compile.js';
export { getOnChainBytecode, hasChainSupport, type ProviderOptions } from './provider.js';
export { compareBytecode, compareRuntimeBytecode, type BytecodeComparisonResult } from './bytecode.js';
export { verifyOnExplorer, type ExplorerVerifyResult } from './explorer-api.js';

import { compileSource } from './compile.js';
import { getOnChainBytecode, hasChainSupport, type ProviderOptions } from './provider.js';
import { compareRuntimeBytecode } from './bytecode.js';
import type { ChainKey } from '@clawcontractbook/shared';

export interface VerificationOptions {
  contractAddress: string;
  chainKey: ChainKey;
  sourceCode: string;
  contractName?: string;
  timeout?: number;
}

export interface VerificationResult {
  success: boolean;
  level1: boolean;
  level3: boolean;
  errors: string[];
  details?: {
    onChainBytecode?: string;
    compiledBytecode?: string;
    onChainHash?: string;
    compiledHash?: string;
  };
}

const COMPILER_VERSION = '0.8.20+commit.a1b79de6';

export async function verifyContract(options: VerificationOptions): Promise<VerificationResult> {
  const { contractAddress, chainKey, sourceCode, contractName, timeout = 30000 } = options;
  const errors: string[] = [];

  let onChainBytecode: string | undefined;
  let compiledResult: { runtimeBytecode: string } | undefined;

  // Level 1: Check if contract exists on chain
  try {
    onChainBytecode = await getOnChainBytecode(contractAddress, { chainKey, timeout });

    if (!onChainBytecode || onChainBytecode === '0x') {
      errors.push('CONTRACT_NOT_FOUND: No contract code at address');
      return {
        success: false,
        level1: false,
        level3: false,
        errors,
      };
    }
  } catch (error) {
    errors.push(`LEVEL1_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      level1: false,
      level3: false,
      errors,
    };
  }

  // Level 3: Compile source and compare bytecode
  try {
    compiledResult = compileSource({ sourceCode, contractName });
  } catch (error) {
    errors.push(`COMPILE_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      level1: true,
      level3: false,
      errors,
      details: {
        onChainBytecode,
      },
    };
  }

  const comparison = compareRuntimeBytecode(onChainBytecode, compiledResult.runtimeBytecode);

  if (!comparison.matches) {
    errors.push('BYTECODE_MISMATCH: Compiled bytecode does not match on-chain code');
  }

  return {
    success: comparison.matches,
    level1: true,
    level3: comparison.matches,
    errors,
    details: {
      onChainBytecode,
      compiledBytecode: compiledResult.runtimeBytecode,
      onChainHash: comparison.onChainHash,
      compiledHash: comparison.compiledHash,
    },
  };
}

export function getCompilerVersion(): string {
  return COMPILER_VERSION;
}
