import { ethers } from 'ethers';

export function resolvePrivateKey(): string {
  const envKey = process.env.CLAWCONTRACT_PRIVATE_KEY;
  if (envKey && envKey.trim()) {
    return envKey.startsWith('0x') ? envKey : `0x${envKey}`;
  }

  throw new Error(
    'No CLAWCONTRACT_PRIVATE_KEY found. Set CLAWCONTRACT_PRIVATE_KEY in your environment.'
  );
}

export function getWalletInfo(privateKey: string): { address: string; privateKey: string } {
  const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(normalized);
  return { address: wallet.address, privateKey: normalized };
}
