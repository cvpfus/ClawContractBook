import { keccak256 } from 'ethers';

export interface BytecodeComparisonResult {
  matches: boolean;
  onChainLength: number;
  compiledLength: number;
  onChainHash: string;
  compiledHash: string;
}

/** Strip Solidity CBOR metadata from end of runtime bytecode. The last 2 bytes encode metadata length. */
function stripMetadata(hex: string): string {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (raw.length < 4) return hex;
  const lenBytes = parseInt(raw.slice(-4), 16);
  if (lenBytes <= 0 || lenBytes > 200) return hex;
  const stripHexChars = (lenBytes + 2) * 2;
  if (raw.length <= stripHexChars) return hex;
  const trimmed = raw.slice(0, -stripHexChars);
  return `0x${trimmed}`;
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
  const onChainRaw = onChainBytecode.startsWith('0x') 
    ? onChainBytecode 
    : `0x${onChainBytecode}`;
  const compiledRaw = compiledRuntimeBytecode.startsWith('0x') 
    ? compiledRuntimeBytecode 
    : `0x${compiledRuntimeBytecode}`;

  const onChain = stripMetadata(onChainRaw);
  const compiled = stripMetadata(compiledRaw);

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
