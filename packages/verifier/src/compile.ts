import solc from 'solc';
import { keccak256 } from 'ethers';

export interface CompileResult {
  bytecode: string;
  bytecodeHash: string;
  runtimeBytecode: string;
  runtimeBytecodeHash: string;
  compilerVersion: string;
}

export interface CompileOptions {
  sourceCode: string;
  contractName?: string;
}

const COMPILER_VERSION = '0.8.20';
const OPTIMIZATION_RUNS = 200;

function toHexString(bytes: Uint8Array | string): string {
  if (typeof bytes === 'string') {
    return bytes.startsWith('0x') ? bytes : `0x${bytes}`;
  }
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function compileSource(options: CompileOptions): CompileResult {
  const { sourceCode } = options;
  
  const contractName = options.contractName || extractContractName(sourceCode);
  
  const input = {
    language: 'Solidity',
    sources: {
      [contractName]: {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: OPTIMIZATION_RUNS,
      },
      evmVersion: 'paris',
      outputSelection: {
        '*': {
          '*': ['evm.bytecode', 'evm.deployedBytecode'],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (path: string) => ({
        contents: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;',
      }),
    })
  );

  if (output.errors) {
    const errors = output.errors.filter((e: { severity: string }) => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error(`Compilation errors: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
    }
  }

  // Find contract - solc keys by source path; we use contractName as source key,
  // but imports can produce other keys. Search all source units for the contract.
  type EvmArtifact = { evm?: { bytecode?: { object?: string }; deployedBytecode?: { object?: string } } };
  let artifact: EvmArtifact | undefined;
  const contracts = output.contracts || {};
  for (const sourceUnit of Object.values(contracts) as Record<string, EvmArtifact>[]) {
    if (contractName in sourceUnit) {
      artifact = sourceUnit[contractName];
      break;
    }
  }
  // Fallback: if exactly one contract in one source, use it (e.g. when source key differs)
  if (!artifact && Object.keys(contracts).length === 1) {
    const soleUnit = Object.values(contracts)[0] as Record<string, EvmArtifact>;
    artifact = Object.values(soleUnit)[0];
  }
  if (!artifact) {
    const available = Object.keys(contracts).flatMap((k) =>
      Object.keys((contracts as Record<string, Record<string, EvmArtifact>>)[k] || {})
    );
    throw new Error(
      `Contract "${contractName}" not found in source. Available: ${available.length ? available.join(', ') : 'none'}`
    );
  }

  const bytecode = artifact.evm?.bytecode?.object;
  const runtimeBytecode = artifact.evm?.deployedBytecode?.object;

  if (!bytecode || !runtimeBytecode) {
    throw new Error('Compilation succeeded but no bytecode generated');
  }

  const bytecodeHex = toHexString(bytecode);
  const runtimeHex = toHexString(runtimeBytecode);

  return {
    bytecode: bytecodeHex,
    bytecodeHash: keccak256(bytecodeHex),
    runtimeBytecode: runtimeHex,
    runtimeBytecodeHash: keccak256(runtimeHex),
    compilerVersion: COMPILER_VERSION,
  };
}

function extractContractName(sourceCode: string): string {
  const match = sourceCode.match(/contract\s+(\w+)/);
  if (!match) {
    throw new Error('Could not find contract name in source file');
  }
  return match[1];
}
