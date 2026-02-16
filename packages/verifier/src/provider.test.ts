import { describe, it, expect } from 'vitest';
import { hasChainSupport, getOnChainBytecode } from './provider.js';

describe('hasChainSupport', () => {
  it('returns true for supported chains', () => {
    expect(hasChainSupport('bsc-mainnet')).toBe(true);
    expect(hasChainSupport('bsc-testnet')).toBe(true);
    expect(hasChainSupport('opbnb-mainnet')).toBe(true);
    expect(hasChainSupport('opbnb-testnet')).toBe(true);
  });

  it('returns false for unsupported chains', () => {
    expect(hasChainSupport('ethereum')).toBe(false);
    expect(hasChainSupport('polygon')).toBe(false);
    expect(hasChainSupport('')).toBe(false);
    expect(hasChainSupport('bsc-mainnet-typo')).toBe(false);
  });
});

describe('getOnChainBytecode', () => {
  it('throws for unsupported chain', async () => {
    await expect(
      getOnChainBytecode('0x0000000000000000000000000000000000000001', {
        chainKey: 'unsupported-chain' as 'bsc-mainnet',
      })
    ).rejects.toThrow('Unsupported chain');
  });
});
