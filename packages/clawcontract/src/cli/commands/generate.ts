import chalk from 'chalk';
import ora from 'ora';
import { displayBanner, displayError, displayResult } from '../utils.js';
import { generateContract } from '../../generator/index.js';

export async function generateCommand(
  description: string,
  options: { chain: string; output: string },
): Promise<string> {
  displayBanner();
  console.log(chalk.bold('Generating Smart Contract\n'));
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
