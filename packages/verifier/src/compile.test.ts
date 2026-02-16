import { describe, it, expect } from 'vitest';
import { compileSource } from './compile.js';

const SIMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Simple {
    function get() public pure returns (uint256) {
        return 42;
    }
}
`;

const MULTIPLE_CONTRACTS = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Helper {
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
}

contract Main {
    function compute() public pure returns (uint256) {
        return 1;
    }
}
`;

describe('compileSource', () => {
  it('compiles simple contract and returns bytecode hashes', () => {
    const result = compileSource({ sourceCode: SIMPLE_CONTRACT });

    expect(result.bytecode).toMatch(/^0x[0-9a-f]+$/i);
    expect(result.runtimeBytecode).toMatch(/^0x[0-9a-f]+$/i);
    expect(result.bytecodeHash).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(result.runtimeBytecodeHash).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(result.compilerVersion).toBe('0.8.20');
  });

  it('extracts contract name from source when not provided', () => {
    const result = compileSource({ sourceCode: SIMPLE_CONTRACT });

    expect(result.bytecode.length).toBeGreaterThan(0);
    expect(result.runtimeBytecode.length).toBeGreaterThan(0);
  });

  it('uses explicit contractName when provided', () => {
    const result = compileSource({
      sourceCode: MULTIPLE_CONTRACTS,
      contractName: 'Main',
    });

    expect(result.bytecode).toMatch(/^0x[0-9a-f]+$/i);
    expect(result.runtimeBytecode).toMatch(/^0x[0-9a-f]+$/i);
  });

  it('compiles Helper when specified in multi-contract source', () => {
    const mainResult = compileSource({
      sourceCode: MULTIPLE_CONTRACTS,
      contractName: 'Main',
    });
    const helperResult = compileSource({
      sourceCode: MULTIPLE_CONTRACTS,
      contractName: 'Helper',
    });

    expect(mainResult.bytecode).not.toBe(helperResult.bytecode);
    expect(mainResult.runtimeBytecodeHash).not.toBe(helperResult.runtimeBytecodeHash);
  });

  it('throws when source has no contract', () => {
    expect(() =>
      compileSource({ sourceCode: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;' })
    ).toThrow('Could not find contract name');
  });

  it('throws when source has syntax errors', () => {
    const invalidSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bad {
    function broken( {  // invalid syntax
`;
    expect(() => compileSource({ sourceCode: invalidSource })).toThrow(/Compilation errors/);
  });
});
