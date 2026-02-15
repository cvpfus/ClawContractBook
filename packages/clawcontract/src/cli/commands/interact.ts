import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { ethers } from 'ethers';
import { getChain } from '../../config/chains.js';
import { loadDeployment } from '../../deployer/metadata.js';
import { compileContract } from '../../deployer/compiler.js';
import { resolvePrivateKey } from '../../deployer/wallet.js';
import { displayBanner, displayError, displayResult } from '../utils.js';

interface AbiInput {
  name: string;
  type: string;
}

interface AbiFragment {
  type: string;
  name: string;
  inputs: AbiInput[];
  outputs: AbiInput[];
  stateMutability: string;
}

function coerceArg(value: string, abiType: string): unknown {
  if (/^u?int\d*$/.test(abiType)) {
    return value;
  }
  if (abiType === 'address') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error(`Invalid address: ${value}`);
    }
    return value;
  }
  if (abiType === 'bool') {
    return value.toLowerCase() === 'true';
  }
  if (abiType === 'string') {
    return value;
  }
  if (abiType.startsWith('bytes')) {
    return value;
  }
  if (abiType.endsWith('[]') || abiType.startsWith('(')) {
    return JSON.parse(value);
  }
  return value;
}

export async function interactCommand(
  address: string,
  functionName: string,
  args: string[],
  options: { chain: string; file?: string; value?: string },
): Promise<void> {
  displayBanner();
  console.log(chalk.bold('Interact with Contract\n'));

  const chainConfig = getChain(options.chain);
  displayResult('Contract', address);
  displayResult('Chain', `${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  displayResult('Function', functionName);
  console.log('');

  let abi: readonly Record<string, unknown>[];

  const deployment = loadDeployment(address, './contracts');
  if (deployment) {
    abi = deployment.abi;
  } else if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    const spinner = ora('Compiling contract for ABI...').start();
    try {
      const result = await compileContract(filePath);
      abi = result.abi;
      spinner.succeed('ABI resolved from compilation');
    } catch (error) {
      spinner.fail('Compilation failed');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      process.exitCode = 1;
      return;
    }
  } else {
    displayError(
      `No ABI found for ${address}. Deploy via ClawContract or provide --file <source.sol>`,
    );
    process.exitCode = 1;
    return;
  }

  const abiFragments = (abi as unknown as AbiFragment[]).filter(
    (entry) => entry.type === 'function',
  );
  const fragment = abiFragments.find((f) => f.name === functionName);

  if (!fragment) {
    const available = abiFragments.map((f) => f.name).join(', ');
    displayError(`Function "${functionName}" not found in ABI. Available: ${available}`);
    process.exitCode = 1;
    return;
  }

  const coercedArgs = fragment.inputs.map((input, i) => {
    if (i >= args.length) {
      throw new Error(`Missing argument for ${input.name} (${input.type})`);
    }
    return coerceArg(args[i], input.type);
  });

  const isReadOnly =
    fragment.stateMutability === 'view' || fragment.stateMutability === 'pure';

  if (isReadOnly) {
    const spinner = ora('Calling read-only function...').start();
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
        name: chainConfig.name,
        chainId: chainConfig.chainId,
      });
      const contract = new ethers.Contract(address, abi as ethers.InterfaceAbi, provider);
      const result = await contract[functionName](...coercedArgs);
      spinner.succeed('Call completed');
      console.log('');
      displayResult('Result', String(result));
    } catch (error) {
      spinner.fail('Call failed');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      process.exitCode = 1;
    }
  } else {
    const privateKey = resolvePrivateKey();
    const spinner = ora('Sending transaction...').start();
    try {
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
        name: chainConfig.name,
        chainId: chainConfig.chainId,
      });
      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(address, abi as ethers.InterfaceAbi, wallet);
      const overrides: Record<string, unknown> = {};
      if (options.value) {
        overrides.value = BigInt(options.value);
      }
      const tx = await contract[functionName](...coercedArgs, overrides);
      spinner.text = 'Waiting for confirmation...';
      const receipt = await tx.wait();
      spinner.succeed('Transaction confirmed');
      console.log('');
      displayResult('Transaction Hash', receipt.hash);
      displayResult('Block Number', receipt.blockNumber.toString());
      displayResult('Gas Used', receipt.gasUsed.toString());
      displayResult(
        'Explorer URL',
        `${chainConfig.explorerUrl}/tx/${receipt.hash}`,
      );
    } catch (error) {
      spinner.fail('Transaction failed');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      process.exitCode = 1;
    }
  }
}
