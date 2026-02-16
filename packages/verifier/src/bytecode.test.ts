import { describe, it, expect } from 'vitest';
import { compareBytecode, compareRuntimeBytecode } from './bytecode.js';

describe('compareBytecode', () => {
  it('returns matches: true when bytecode hashes are equal', () => {
    const bytecode = '0x6080604052348015600f57600080fd5b506004361060325760003560e01c806301ffc9a71460375780633659cfe614605257600080fd5b';
    const result = compareBytecode(bytecode, bytecode);

    expect(result.matches).toBe(true);
    expect(result.onChainHash).toBe(result.compiledHash);
    expect(result.onChainLength).toBe(result.compiledLength);
  });

  it('returns matches: false when bytecode differs', () => {
    const a = '0x1234';
    const b = '0x5678';
    const result = compareBytecode(a, b);

    expect(result.matches).toBe(false);
    expect(result.onChainHash).not.toBe(result.compiledHash);
  });

  it('accepts bytecode without 0x prefix', () => {
    const hex = '6080604052';
    const result = compareBytecode(hex, `0x${hex}`);

    expect(result.matches).toBe(true);
    expect(result.onChainHash).toBe(result.compiledHash);
  });
});

describe('compareRuntimeBytecode', () => {
  it('returns matches: true when runtime bytecode hashes are equal', () => {
    const bytecode = '0x6080604052348015600f57600080fd5b506004361060325760003560e01c806301ffc9a71460375780633659cfe614605257600080fd5b';
    const result = compareRuntimeBytecode(bytecode, bytecode);

    expect(result.matches).toBe(true);
    expect(result.onChainHash).toBe(result.compiledHash);
  });

  it('returns matches: false when runtime bytecode differs', () => {
    const a = '0xabcd';
    const b = '0xef01';
    const result = compareRuntimeBytecode(a, b);

    expect(result.matches).toBe(false);
    expect(result.onChainHash).not.toBe(result.compiledHash);
  });

  it('includes length in result', () => {
    const short = '0x1234';
    const long = '0x12345678';
    const result = compareRuntimeBytecode(short, long);

    expect(result.onChainLength).toBe(6); // "0x1234"
    expect(result.compiledLength).toBe(10); // "0x12345678"
    expect(result.matches).toBe(false);
  });
});
