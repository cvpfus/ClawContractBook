export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export const CHAINS: Record<string, ChainConfig> = {
  'bsc-mainnet': {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    explorerApiUrl: 'https://api.bscscan.com/api',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    isTestnet: false,
  },
  'bsc-testnet': {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    isTestnet: true,
  },
  'opbnb-mainnet': {
    name: 'opBNB',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorerUrl: 'https://opbnbscan.com',
    explorerApiUrl: 'https://api-opbnb.bscscan.com/api',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    isTestnet: false,
  },
  'opbnb-testnet': {
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorerUrl: 'https://testnet.opbnbscan.com',
    explorerApiUrl: 'https://api-opbnb-testnet.bscscan.com/api',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    isTestnet: true,
  },
};

export function getChain(key: string): ChainConfig {
  const chain = CHAINS[key];
  if (!chain) {
    throw new Error(`Unknown chain: ${key}. Available: ${Object.keys(CHAINS).join(', ')}`);
  }
  return chain;
}

export function getTestnetChains(): Record<string, ChainConfig> {
  return Object.fromEntries(Object.entries(CHAINS).filter(([, c]) => c.isTestnet));
}

export function getMainnetChains(): Record<string, ChainConfig> {
  return Object.fromEntries(Object.entries(CHAINS).filter(([, c]) => !c.isTestnet));
}
