import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { displayBanner, displayError, displayResult } from '../utils.js';
import { generateContract } from '../../generator/index.js';

export interface GenerateCommandOptions {
  chain: string;
  output: string;
  /** Inline Solidity source instead of AI generation */
  source?: string;
  /** Read Solidity source from stdin */
  stdin?: boolean;
}

export async function generateCommand(
  description: string | undefined,
  options: GenerateCommandOptions,
): Promise<string> {
  displayBanner();
  console.log(chalk.bold('Generating Smart Contract\n'));

  let source: string | undefined;
  if (options.stdin) {
    source = fs.readFileSync(0, 'utf-8');
    displayResult('Input', 'stdin');
  } else if (options.source) {
    source = options.source;
    displayResult('Input', '--source');
  }

  if (source) {
    displayResult('Target Chain', options.chain);
    console.log('');
    const spinner = ora('Writing contract to file...').start();
    try {
      const result = await generateContract({
        source,
        outputDir: options.output,
        useAI: false,
      });
      spinner.succeed('Contract written successfully');
      console.log('');
      displayResult('Output File', result.filePath);
      displayResult('Contract Name', result.contractName);
      displayResult('AI Generated', 'No');
      return result.filePath;
    } catch (error) {
      spinner.fail('Failed to write contract');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      throw error;
    }
  }

  if (!description) {
    displayError('Provide either a description (for AI) or --source / --stdin (for your own contract).');
    process.exitCode = 1;
    throw new Error('Missing input');
  }

  displayResult('Description', description);
  displayResult('Target Chain', options.chain);
  console.log('');

  const spinner = ora('Generating contract with AI...').start();

  try {
    const result = await generateContract({
      description,
      outputDir: options.output,
      useAI: true,
    });

    spinner.succeed('Contract generated successfully');
    console.log('');
    displayResult('Output File', result.filePath);
    displayResult('Contract Name', result.contractName);
    displayResult('AI Generated', result.aiGenerated ? 'Yes' : 'No');

    return result.filePath;
  } catch (error) {
    spinner.fail('Contract generation failed');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }
}
