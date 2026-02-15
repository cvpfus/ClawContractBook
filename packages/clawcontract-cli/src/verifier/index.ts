import { getChain } from '../config/chains.js';
import { submitVerification, pollVerificationStatus } from './explorer-api.js';

export interface VerifyOptions {
  contractAddress: string;
  chainKey: string;
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

export interface VerifyResult {
  success: boolean;
  message: string;
  explorerUrl: string;
}

export async function verifyContract(options: VerifyOptions): Promise<VerifyResult> {
  const chain = getChain(options.chainKey);

  const useStandardJson = !!options.standardJsonInput;

  const guid = await submitVerification({
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
  });

  const result = await pollVerificationStatus(guid, options.chainKey);

  const explorerUrl = `${chain.explorerUrl}/address/${options.contractAddress}#code`;

  return {
    success: result.success,
    message: result.message,
    explorerUrl,
  };
}
