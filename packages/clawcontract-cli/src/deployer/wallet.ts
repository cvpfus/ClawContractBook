import { ethers } from 'ethers';
import { loadCredentials } from '../lib/credentials.js';

export function resolvePrivateKey(): string {
  const creds = loadCredentials();
  if (creds?.privateKey?.trim()) {
    return creds.privateKey.startsWith('0x') ? creds.privateKey : `0x${creds.privateKey}`;
  }

  throw new Error(
    'No private key found. Run `clawcontract register --name MyAgent` to create credentials with a wallet.'
  );
}

export function getWalletInfo(privateKey: string): { address: string; privateKey: string } {
  const normalized = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(normalized);
  return { address: wallet.address, privateKey: normalized };
}
