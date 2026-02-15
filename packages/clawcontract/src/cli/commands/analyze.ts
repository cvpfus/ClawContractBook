import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { displayBanner, displayError, displayResult } from '../utils.js';
import { analyzeContract, isSlitherAvailable } from '../../analyzer/index.js';
import type { Finding } from '../../analyzer/index.js';

const SEVERITY_COLORS: Record<string, (text: string) => string> = {
  High: chalk.red,
  Medium: chalk.yellow,
  Low: chalk.cyan,
  Informational: chalk.gray,
  Optimization: chalk.blue,
};

export interface AnalyzeCommandResult {
  passed: boolean;
  findings: Finding[];
}

export async function analyzeCommand(file: string): Promise<AnalyzeCommandResult> {
  displayBanner();
  console.log(chalk.bold('Security Analysis\n'));

  const filePath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    displayError(`File not found: ${filePath}`);
    process.exitCode = 1;
    return { passed: true, findings: [] };
  }

  displayResult('File', filePath);

  const slitherReady = isSlitherAvailable();
  displayResult('Engine', slitherReady ? 'Slither' : 'Fallback (regex-based)');
  console.log('');

  const spinner = ora('Running security analysis...').start();

  try {
    const result = await analyzeContract(filePath);

    spinner.succeed('Analysis complete');
    console.log('');

    if (result.findings.length === 0) {
      console.log(chalk.green('  ✔ No issues found'));
      return { passed: result.passed, findings: result.findings };
    }

    for (const finding of result.findings) {
      const colorFn = SEVERITY_COLORS[finding.severity] ?? chalk.white;
      const locationInfo = finding.location ? chalk.gray(` (${finding.location})`) : '';
      console.log(`  ${colorFn(`[${finding.severity}]`)} ${finding.title}${locationInfo}`);
      console.log(chalk.gray(`         ${finding.description}`));
      if (finding.recommendation) {
        console.log(chalk.gray(`         → ${finding.recommendation}`));
      }
      console.log('');
    }

    console.log(chalk.bold('\n  Summary:'));
    const s = result.summary;
    if (s.high > 0) console.log(chalk.red(`    High:          ${s.high}`));
    if (s.medium > 0) console.log(chalk.yellow(`    Medium:        ${s.medium}`));
    if (s.low > 0) console.log(chalk.cyan(`    Low:           ${s.low}`));
    if (s.informational > 0) console.log(chalk.gray(`    Informational: ${s.informational}`));
    if (s.optimization > 0) console.log(chalk.blue(`    Optimization:  ${s.optimization}`));

    console.log('');
    if (result.passed) {
      console.log(chalk.green('  ✔ Analysis passed (no high-severity issues)'));
    } else {
      console.log(chalk.red('  ✘ Analysis failed (high-severity issues found)'));
    }

    return { passed: result.passed, findings: result.findings };
  } catch (error) {
    spinner.fail('Analysis failed');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }
}
