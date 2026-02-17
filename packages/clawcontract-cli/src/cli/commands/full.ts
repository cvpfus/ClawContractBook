import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { displayBanner, displayError } from '../utils.js';
import { createCommand } from './create.js';
import { analyzeCommand } from './analyze.js';
import { deployCommand } from './deploy.js';

export interface FullCommandInput {
  source?: string;
  stdin?: boolean;
  file?: string;
}

export async function fullCommand(
  input: FullCommandInput,
  options: { chain: string; output: string; skipDeploy?: boolean; skipAnalyze?: boolean; publish?: boolean; apiKeyId?: string; apiSecret?: string; description?: string },
): Promise<void> {
  displayBanner();
  console.log(chalk.bold('Full Pipeline: Create → Analyze → Deploy\n'));

  let filePath: string;

  if (input.file) {
    filePath = path.resolve(process.cwd(), input.file);
    if (!fs.existsSync(filePath)) {
      displayError(`File not found: ${filePath}`);
      process.exit(1);
    }
    console.log(chalk.bold.blue('\n━━━ Step 1/3: Create Contract ━━━\n'));
    console.log(chalk.yellow.bold('  ⏭ Using existing file (--file). Skipping create.\n'));
  } else {
    console.log(chalk.bold.blue('\n━━━ Step 1/3: Create Contract ━━━\n'));
    filePath = await createCommand({
      chain: options.chain,
      output: options.output,
      source: input.source,
      stdin: input.stdin,
    });
  }

  // Step 2: Analyze
  if (options.skipAnalyze) {
    console.log(chalk.bold.blue('\n━━━ Step 2/3: Security Analysis ━━━\n'));
    console.log(chalk.yellow.bold('  ⏭ Skipped security analysis (--skip-analyze).\n'));
  } else {
    console.log(chalk.bold.blue('\n━━━ Step 2/3: Security Analysis ━━━\n'));
    const analysisResult = await analyzeCommand(filePath);

    if (options.skipDeploy) {
      console.log(chalk.cyan(`\n  Contract file: ${filePath}`));
      console.log(chalk.cyan(`  Analysis passed: ${analysisResult.passed}`));
      console.log(chalk.yellow.bold('\n  Pipeline stopped after analysis (--skip-deploy).\n'));
      return;
    }
  }

  if (options.skipDeploy) {
    console.log(chalk.cyan(`\n  Contract file: ${filePath}`));
    console.log(chalk.yellow.bold('\n  Pipeline stopped before deployment (--skip-deploy).\n'));
    return;
  }

  // Step 3: Deploy
  console.log(chalk.bold.blue('\n━━━ Step 3/3: Deploy Contract ━━━\n'));
  const deployResult = await deployCommand(filePath, {
    chain: options.chain,
    publish: options.publish,
    apiKeyId: options.apiKeyId,
    apiSecret: options.apiSecret,
    description: options.description,
  });

  if (!deployResult) {
    console.log(chalk.yellow('\nPipeline stopped: deployment did not complete.'));
    return;
  }

  console.log(chalk.gray(`\n  Tip: interact with your contract using:`));
  console.log(chalk.gray(`    clawcontract-cli interact ${deployResult.contractAddress} <function> --chain ${options.chain}\n`));

  console.log(chalk.bold.green('\n✔ Full pipeline complete!\n'));
}
