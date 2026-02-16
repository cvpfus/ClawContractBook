import solc from 'solc';
import { keccak256, zeroPadValue } from 'ethers';

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
      outputSelection: {
        '*': {
          '*': ['bytecode', 'runtimeBytecode'],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), (path: string) => {
      return {
        contents: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;',
      };
    })
  );

  if (output.errors) {
    const errors = output.errors.filter((e: { severity: string }) => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error(`Compilation errors: ${errors.map((e: { message: string }) => e.message).join(', ')}`);
    }
  }

  const contractOutput = output.contracts?.[contractName];
  if (!contractOutput) {
    throw new Error(`Contract "${contractName}" not found in source`);
  }

  const artifact = contractOutput[Object.keys(contractOutput)[0]];
  const bytecode = artifact.bytecode;
  const runtimeBytecode = artifact.runtimeBytecode;

  if (!bytecode) {
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
