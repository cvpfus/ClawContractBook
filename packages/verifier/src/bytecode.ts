import { keccak256 } from 'ethers';

export interface BytecodeComparisonResult {
  matches: boolean;
  onChainLength: number;
  compiledLength: number;
  onChainHash: string;
  compiledHash: string;
}

export function compareBytecode(
  onChainBytecode: string,
  compiledBytecode: string
): BytecodeComparisonResult {
  const onChain = onChainBytecode.startsWith('0x') 
    ? onChainBytecode 
    : `0x${onChainBytecode}`;
  
  const compiled = compiledBytecode.startsWith('0x') 
    ? compiledBytecode 
    : `0x${compiledBytecode}`;

  const onChainHash = keccak256(onChain);
  const compiledHash = keccak256(compiled);

  return {
    matches: onChainHash === compiledHash,
    onChainLength: onChain.length,
    compiledLength: compiled.length,
    onChainHash,
    compiledHash,
  };
}

export function compareRuntimeBytecode(
  onChainBytecode: string,
  compiledRuntimeBytecode: string
): BytecodeComparisonResult {
  const onChain = onChainBytecode.startsWith('0x') 
    ? onChainBytecode 
    : `0x${onChainBytecode}`;
  
  const compiled = compiledRuntimeBytecode.startsWith('0x') 
    ? compiledRuntimeBytecode 
    : `0x${compiledRuntimeBytecode}`;

  const onChainHash = keccak256(onChain);
  const compiledHash = keccak256(compiled);

  return {
    matches: onChainHash === compiledHash,
    onChainLength: onChain.length,
    compiledLength: compiled.length,
    onChainHash,
    compiledHash,
  };
}
