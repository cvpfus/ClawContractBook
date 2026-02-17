import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { displayBanner, displayError, displayResult } from '../utils.js';
import { extractContractName, sanitizeFileName, writeFileUnique, ensureOutputDir } from '../../generator/utils.js';

export interface CreateCommandOptions {
  chain: string;
  output: string;
  source?: string;
  stdin?: boolean;
}

export async function createCommand(
  options: CreateCommandOptions,
): Promise<string> {
  displayBanner();
  console.log(chalk.bold('Create Smart Contract\n'));

  let source: string;
  if (options.stdin) {
    source = fs.readFileSync(0, 'utf-8');
    displayResult('Input', 'stdin');
  } else if (options.source) {
    source = options.source;
    displayResult('Input', '--source');
  } else {
    displayError('Provide Solidity source via --source <code> or --stdin.');
    process.exitCode = 1;
    throw new Error('Missing input');
  }

  displayResult('Target Chain', options.chain);
  console.log('');

  const spinner = ora('Writing contract to file...').start();
  try {
    await ensureOutputDir(options.output);
    const contractName = extractContractName(source);
    const fileName = sanitizeFileName(contractName);
    const filePath = await writeFileUnique(options.output, fileName, source);
    spinner.succeed('Contract written successfully');
    console.log('');
    displayResult('Output File', filePath);
    displayResult('Contract Name', contractName);
    return filePath;
  } catch (error) {
    spinner.fail('Failed to write contract');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }
}
