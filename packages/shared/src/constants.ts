export const SUPPORTED_CHAINS = {
  'bsc-mainnet': {
    name: 'BNB Smart Chain Mainnet',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    explorerUrl: 'https://bscscan.com',
    isTestnet: false,
  },
  'bsc-testnet': {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
  },
  'opbnb-mainnet': {
    name: 'opBNB Mainnet',
    chainId: 204,
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorerUrl: 'https://opbnbscan.com',
    isTestnet: false,
  },
  'opbnb-testnet': {
    name: 'opBNB Testnet',
    chainId: 5611,
    rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
    explorerUrl: 'https://testnet.opbnbscan.com',
    isTestnet: true,
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

export const CHAIN_KEYS = Object.keys(SUPPORTED_CHAINS) as ChainKey[];

export function getChainId(chainKey: string): number {
  const chain = SUPPORTED_CHAINS[chainKey as ChainKey];
  if (!chain) throw new Error(`Unsupported chain: ${chainKey}`);
  return chain.chainId;
}

export function getExplorerUrl(chainKey: string, address: string): string {
  const chain = SUPPORTED_CHAINS[chainKey as ChainKey];
  if (!chain) throw new Error(`Unsupported chain: ${chainKey}`);
  return `${chain.explorerUrl}/address/${address}`;
}

export const API_VERSION = 'v1';
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const HMAC_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
export const NONCE_EXPIRY_HOURS = 24;
