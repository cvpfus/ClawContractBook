import { ethers } from 'ethers';
import { getChain } from '../config/chains.js';
import { compileContract } from './compiler.js';

export interface DeployOptions {
  sourceFile: string;
  chainKey: string;
  constructorArgs?: unknown[];
  privateKey: string;
}

export interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployer: string;
  chainKey: string;
  explorerUrl: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
  fullyQualifiedName: string;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  totalCostWei: bigint;
  totalCostBNB: string;
  totalCostWithBuffer: string;
}

export async function estimateGas(
  sourceFile: string,
  chainKey: string,
  privateKey: string,
): Promise<GasEstimate> {
  const chain = getChain(chainKey);
  const { abi, bytecode } = await compileContract(sourceFile);

  const provider = new ethers.JsonRpcProvider(chain.rpcUrl, {
    name: chain.name,
    chainId: chain.chainId,
  });
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const deployTx = await factory.getDeployTransaction();
  const gasLimit = await provider.estimateGas({
    ...deployTx,
    from: wallet.address,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;

  const totalCostWei = gasLimit * gasPrice;
  const bufferCostWei = (totalCostWei * 120n) / 100n;

  return {
    gasLimit,
    gasPrice,
    totalCostWei,
    totalCostBNB: ethers.formatEther(totalCostWei),
    totalCostWithBuffer: ethers.formatEther(bufferCostWei),
  };
}

export async function deployContract(options: DeployOptions): Promise<DeployResult> {
  const { sourceFile, chainKey, constructorArgs = [], privateKey } = options;
  const chain = getChain(chainKey);
  const compiled = await compileContract(sourceFile);

  const provider = new ethers.JsonRpcProvider(chain.rpcUrl, {
    name: chain.name,
    chainId: chain.chainId,
  });
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(compiled.abi, compiled.bytecode, wallet);

  const contract = await factory.deploy(...constructorArgs);
  const confirmations = chain.isTestnet ? 1 : 3;
  const receipt = await contract.deploymentTransaction()!.wait(confirmations);

  if (!receipt) {
    throw new Error('Deployment transaction failed: no receipt returned');
  }

  const contractAddress = await contract.getAddress();

  return {
    contractAddress,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployer: wallet.address,
    chainKey,
    explorerUrl: `${chain.explorerUrl}/address/${contractAddress}`,
    standardJsonInput: compiled.standardJsonInput,
    solcLongVersion: compiled.solcLongVersion,
    fullyQualifiedName: compiled.fullyQualifiedName,
  };
}
