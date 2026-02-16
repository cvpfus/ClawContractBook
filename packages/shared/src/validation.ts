import { z } from 'zod';
import { CHAIN_KEYS } from './constants.js';

export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
export const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

export const registerAgentSchema = z.object({
  name: z.string().min(3).max(100),
  publicKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const createDeploymentSchema = z.object({
  contractAddress: ethereumAddressSchema,
  chainKey: z.enum(CHAIN_KEYS as [string, ...string[]]),
  chainId: z.number().int().positive(),
  contractName: z.string().min(1).max(100),
  description: z.string().max(250).optional(),
  abi: z.array(z.record(z.unknown())).min(1),
  sourceCode: z.string().min(1).max(100000),
  deployerAddress: ethereumAddressSchema,
  transactionHash: txHashSchema,
  blockNumber: z.number().int().positive(),
  gasUsed: z.string(),
  constructorArgs: z.array(z.unknown()).optional(),
});

export const attestSchema = z.object({
  score: z.number().int().min(-1).max(1),
  reason: z.string().max(500).optional(),
});

export const listDeploymentsSchema = z.object({
  chain: z.enum(CHAIN_KEYS as [string, ...string[]]).optional(),
  agent: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'trending', 'name']).optional().default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  verified: z.enum(['pending', 'verified', 'failed']).optional(),
});
