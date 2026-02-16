import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyContract, getCompilerVersion } from './index.js';

// Mock provider to avoid network calls
vi.mock('./provider.js', () => ({
  getOnChainBytecode: vi.fn(),
}));

// We need to import after mock
import { getOnChainBytecode } from './provider.js';
import { compileSource } from './compile.js';

const SIMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Simple {
    function get() public pure returns (uint256) {
        return 42;
    }
}
`;

describe('getCompilerVersion', () => {
  it('returns compiler version string', () => {
    const version = getCompilerVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('verifyContract', () => {
  beforeEach(() => {
    vi.mocked(getOnChainBytecode).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns level1: false when contract not found at address', async () => {
    vi.mocked(getOnChainBytecode).mockResolvedValue('0x');

    const result = await verifyContract({
      contractAddress: '0x0000000000000000000000000000000000000001',
      chainKey: 'bsc-testnet',
      sourceCode: SIMPLE_CONTRACT,
    });

    expect(result.success).toBe(false);
    expect(result.level1).toBe(false);
    expect(result.level3).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('CONTRACT_NOT_FOUND'));
  });

  it('returns level1: false when getCode fails', async () => {
    vi.mocked(getOnChainBytecode).mockRejectedValue(new Error('Network error'));

    const result = await verifyContract({
      contractAddress: '0x0000000000000000000000000000000000000001',
      chainKey: 'bsc-testnet',
      sourceCode: SIMPLE_CONTRACT,
    });

    expect(result.success).toBe(false);
    expect(result.level1).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('LEVEL1_ERROR'));
  });

  it('returns level3: false when compilation fails', async () => {
    vi.mocked(getOnChainBytecode).mockResolvedValue('0x6080604052348015600f57600080fd5b50');

    const result = await verifyContract({
      contractAddress: '0x0000000000000000000000000000000000000001',
      chainKey: 'bsc-testnet',
      sourceCode: 'invalid solidity {',
    });

    expect(result.success).toBe(false);
    expect(result.level1).toBe(true);
    expect(result.level3).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('COMPILE_ERROR'));
  });

  it('returns success when bytecode matches', async () => {
    const compiled = compileSource({ sourceCode: SIMPLE_CONTRACT });
    vi.mocked(getOnChainBytecode).mockResolvedValue(compiled.runtimeBytecode);

    const result = await verifyContract({
      contractAddress: '0x0000000000000000000000000000000000000001',
      chainKey: 'bsc-testnet',
      sourceCode: SIMPLE_CONTRACT,
    });

    expect(result.success).toBe(true);
    expect(result.level1).toBe(true);
    expect(result.level3).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.details?.onChainBytecode).toBe(compiled.runtimeBytecode);
    expect(result.details?.compiledBytecode).toBe(compiled.runtimeBytecode);
  });

  it('returns BYTECODE_MISMATCH when on-chain differs from compiled', async () => {
    vi.mocked(getOnChainBytecode).mockResolvedValue('0xdeadbeef');

    const result = await verifyContract({
      contractAddress: '0x0000000000000000000000000000000000000001',
      chainKey: 'bsc-testnet',
      sourceCode: SIMPLE_CONTRACT,
    });

    expect(result.success).toBe(false);
    expect(result.level1).toBe(true);
    expect(result.level3).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('BYTECODE_MISMATCH'));
    expect(result.details?.onChainHash).not.toBe(result.details?.compiledHash);
  });
});
