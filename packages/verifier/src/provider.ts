import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, type ChainKey } from '@clawcontractbook/shared';

export interface ProviderOptions {
  chainKey: ChainKey;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30000;

export async function getOnChainBytecode(
  address: string,
  options: ProviderOptions
): Promise<string> {
  const { chainKey, timeout = DEFAULT_TIMEOUT } = options;
  
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainKey}`);
  }

  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

  try {
    const code = await provider.getCode(address);
    return code;
  } catch (error) {
    throw new Error(`Failed to get bytecode: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    provider.destroy();
  }
}

export function hasChainSupport(chainKey: string): chainKey is ChainKey {
  return chainKey in SUPPORTED_CHAINS;
}
