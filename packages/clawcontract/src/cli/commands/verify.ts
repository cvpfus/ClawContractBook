import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { getChain } from '../../config/chains.js';
import { verifyContract } from '../../verifier/index.js';
import { compileContract } from '../../deployer/compiler.js';
import { extractContractName } from '../../generator/utils.js';
import { displayBanner, displayError, displayResult } from '../utils.js';

export interface VerifyCommandOptions {
  chain: string;
  file: string;
  standardJsonInput?: unknown;
  solcLongVersion?: string;
  fullyQualifiedName?: string;
}

export async function verifyCommand(
  address: string,
  options: VerifyCommandOptions,
): Promise<void> {
  displayBanner();
  console.log(chalk.bold('Verify Contract\n'));

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    displayError('Invalid contract address format');
    process.exitCode = 1;
    return;
  }

  const chainConfig = getChain(options.chain);

  displayResult('Address', address);
  displayResult('Chain', `${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  if (options.file) {
    displayResult('Source File', options.file);
  }
  console.log('');

  if (!options.file) {
    displayError('Source file is required for verification. Use --file <path>');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), options.file);
  if (!fs.existsSync(filePath)) {
    displayError(`Source file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const contractName = extractContractName(fs.readFileSync(filePath, 'utf-8'));
  displayResult('Contract Name', contractName);
  console.log('');

  let standardJsonInput = options.standardJsonInput;
  let solcLongVersion = options.solcLongVersion;
  let fullyQualifiedName = options.fullyQualifiedName;

  if (!standardJsonInput) {
    const compileSpinner = ora('Compiling contract for verification...').start();
    try {
      const compiled = await compileContract(filePath);
      standardJsonInput = compiled.standardJsonInput;
      solcLongVersion = compiled.solcLongVersion;
      fullyQualifiedName = compiled.fullyQualifiedName;
      compileSpinner.succeed('Compilation complete');
    } catch (error) {
      compileSpinner.fail('Compilation failed');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      throw error;
    }
  }

  const spinner = ora('Submitting verification request...').start();

  try {
    spinner.text = 'Verifying contract (this may take a moment)...';

    const result = await verifyContract({
      contractAddress: address,
      chainKey: options.chain,
      standardJsonInput,
      solcLongVersion,
      fullyQualifiedName,
      contractName,
    });

    if (result.success) {
      spinner.succeed('Contract verified successfully');
    } else {
      spinner.fail('Contract verification failed');
    }

    console.log('');
    displayResult('Status', result.success ? 'Verified' : 'Failed');
    displayResult('Message', result.message);
    displayResult('Explorer URL', result.explorerUrl);
  } catch (error) {
    spinner.fail('Verification failed');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }
}
