import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { displayBanner, displayError } from '../utils.js';
import { generateCommand } from './generate.js';
import { analyzeCommand } from './analyze.js';
import { deployCommand } from './deploy.js';
import { verifyCommand } from './verify.js';
import { createLLMClient } from '../../generator/index.js';

const MAX_FIX_ATTEMPTS = 3;

async function autoFixHighSeverity(
  filePath: string,
): Promise<{ passed: boolean }> {
  const llm = createLLMClient();

  for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
    console.log(chalk.bold.yellow(`\n  🔧 AI Auto-Fix Attempt ${attempt}/${MAX_FIX_ATTEMPTS}\n`));

    const source = fs.readFileSync(filePath, 'utf-8');
    const analysisResult = await analyzeCommand(filePath);
    const highFindings = analysisResult.findings.filter((f) => f.severity === 'High');

    if (highFindings.length === 0) {
      console.log(chalk.green('  ✔ All high-severity issues resolved'));
      return { passed: true };
    }

    const issues = highFindings.map(
      (f) => `[${f.severity}] ${f.title}: ${f.description}${f.recommendation ? ` (Recommendation: ${f.recommendation})` : ''}`,
    );

    const spinner = ora(`Asking AI to fix ${highFindings.length} high-severity issue(s)...`).start();

    try {
      const fixedSource = await llm.suggestFixes(source, issues);
      fs.writeFileSync(filePath, fixedSource, 'utf-8');
      spinner.succeed('AI applied fixes');
    } catch (error) {
      spinner.fail('AI fix failed');
      const message = error instanceof Error ? error.message : String(error);
      displayError(message);
      return { passed: false };
    }
  }

  console.log(chalk.yellow(`\n  Re-analyzing after ${MAX_FIX_ATTEMPTS} fix attempts...`));
  const finalResult = await analyzeCommand(filePath);
  const stillHasHigh = finalResult.findings.some((f) => f.severity === 'High');

  if (stillHasHigh) {
    console.log(chalk.red.bold(`\n  ⚠ High-severity issues remain after ${MAX_FIX_ATTEMPTS} fix attempts. Continuing anyway...`));
  } else {
    console.log(chalk.green('  ✔ All high-severity issues resolved'));
  }

  return { passed: !stillHasHigh };
}

export async function fullCommand(
  description: string,
  options: { chain: string; output: string; skipDeploy?: boolean; skipFix?: boolean; skipAnalyze?: boolean; publish?: boolean; description?: string },
): Promise<void> {
  displayBanner();
  console.log(chalk.bold('Full Pipeline: Generate → Analyze → Deploy → Verify\n'));

  // Step 1: Generate
  console.log(chalk.bold.blue('\n━━━ Step 1/4: Generate Contract ━━━\n'));
  const filePath = await generateCommand(description, options);

  // Step 2: Analyze
  if (options.skipAnalyze) {
    console.log(chalk.bold.blue('\n━━━ Step 2/4: Security Analysis ━━━\n'));
    console.log(chalk.yellow.bold('  ⏭ Skipped security analysis (--skip-analyze).\n'));
  } else {
    console.log(chalk.bold.blue('\n━━━ Step 2/4: Security Analysis ━━━\n'));
    const analysisResult = await analyzeCommand(filePath);

    if (!analysisResult.passed) {
      const hasHigh = analysisResult.findings.some((f) => f.severity === 'High');
      if (hasHigh) {
        if (options.skipFix) {
          console.log(chalk.yellow.bold('\n  ⚠ High-severity issues found — skipping auto-fix (--skip-fix).'));
        } else {
          console.log(chalk.red.bold('\n  ⚠ High-severity issues detected — attempting AI auto-fix...'));
          await autoFixHighSeverity(filePath);
        }
      }
    }

    if (options.skipDeploy) {
      console.log(chalk.cyan(`\n  Generated contract: ${filePath}`));
      console.log(chalk.cyan(`  Analysis passed: ${analysisResult.passed}`));
      console.log(chalk.yellow.bold('\n  Pipeline stopped after analysis (--skip-deploy).\n'));
      return;
    }
  }

  if (options.skipDeploy) {
    console.log(chalk.cyan(`\n  Generated contract: ${filePath}`));
    console.log(chalk.yellow.bold('\n  Pipeline stopped before deployment (--skip-deploy).\n'));
    return;
  }

  // Step 3: Deploy
  console.log(chalk.bold.blue('\n━━━ Step 3/4: Deploy Contract ━━━\n'));
  const deployResult = await deployCommand(filePath, { chain: options.chain, publish: options.publish, description: options.description });

  if (!deployResult) {
    console.log(chalk.yellow('\nPipeline stopped: deployment did not complete.'));
    return;
  }

  console.log(chalk.gray(`\n  Tip: interact with your contract using:`));
  console.log(chalk.gray(`    clawcontract interact ${deployResult.contractAddress} <function> --chain ${options.chain}\n`));

  // Step 4: Verify
  console.log(chalk.bold.blue('\n━━━ Step 4/4: Verify Contract ━━━\n'));
  await verifyCommand(deployResult.contractAddress, {
    chain: options.chain,
    file: filePath,
    standardJsonInput: deployResult.standardJsonInput,
    solcLongVersion: deployResult.solcLongVersion,
    fullyQualifiedName: deployResult.fullyQualifiedName,
  });

  console.log(chalk.bold.green('\n✔ Full pipeline complete!\n'));
}
