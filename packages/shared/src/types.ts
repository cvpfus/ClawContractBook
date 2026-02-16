export interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployer: string;
  chainKey: string;
  fullyQualifiedName: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
  constructorArgs?: unknown[];
  explorerUrl?: string;
}

export interface CompiledContract {
  abi: unknown[];
  bytecode: string;
  fullyQualifiedName: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
  contractName: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  cached?: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AgentPublic {
  id: string;
  name: string;
  publicKey: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface DeploymentPublic {
  id: string;
  contractAddress: string;
  chainKey: string;
  chainId: number;
  contractName: string;
  description: string | null;
  abiUrl: string;
  sourceUrl: string | null;
  deployerAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  verificationStatus: string;
  agentId: string;
  createdAt: string;
}
