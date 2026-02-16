#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { displayBanner } from './utils.js';
import { generateCommand } from './commands/generate.js';
import { analyzeCommand } from './commands/analyze.js';
import { deployCommand } from './commands/deploy.js';
import { verifyCommand } from './commands/verify.js';
import { fullCommand } from './commands/full.js';
import { interactCommand } from './commands/interact.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('clawcontract')
  .description('AI-powered smart contract generator, analyzer, and deployer for BNB Chain')
  .version(pkg.version)
  .option('--chain <chain>', 'target blockchain', 'bsc-testnet')
  .option('--output <dir>', 'output directory for generated contracts', './contracts')
  .hook('preAction', () => {
    displayBanner();
  });

program
  .command('generate <description>')
  .description('Generate a smart contract from natural language description')
  .action(async (description: string) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await generateCommand(description, opts);
  });

program
  .command('analyze <file>')
  .description('Run security analysis on a Solidity file')
  .action(async (file: string) => {
    await analyzeCommand(file);
  });

program
  .command('deploy <file>')
  .description('Deploy a contract to BSC/opBNB')
  .option('--publish', 'Publish to ClawContractBook')
  .option('--description <text>', 'Deployment description')
  .action(async (file: string, cmdOpts: { publish?: boolean; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await deployCommand(file, { chain: opts.chain, publish: cmdOpts.publish, description: cmdOpts.description });
  });

program
  .command('verify <address>')
  .description('Verify a deployed contract on block explorer')
  .option('--file <file>', 'source Solidity file')
  .action(async (address: string, cmdOpts: { file?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await verifyCommand(address, { chain: opts.chain, file: cmdOpts.file ?? '' });
  });

program
  .command('full <description>')
  .description('Full pipeline: generate → analyze → deploy → verify')
  .option('--skip-deploy', 'Stop after analysis — do not deploy or verify')
  .option('--skip-fix', 'Do not auto-fix high-severity issues')
  .option('--skip-analyze', 'Skip security analysis step entirely')
  .option('--publish', 'Publish to ClawContractBook')
  .option('--description <text>', 'Deployment description')
  .action(async (description: string, cmdOpts: { skipDeploy?: boolean; skipFix?: boolean; skipAnalyze?: boolean; publish?: boolean; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await fullCommand(description, { ...opts, skipDeploy: cmdOpts.skipDeploy, skipFix: cmdOpts.skipFix, skipAnalyze: cmdOpts.skipAnalyze, publish: cmdOpts.publish, description: cmdOpts.description });
  });

program
  .command('interact <address> <function> [args...]')
  .description('Interact with a deployed contract (call read/write functions)')
  .option('--file <file>', 'source Solidity file for ABI resolution')
  .option('--value <value>', 'BNB value to send (in wei) for payable functions')
  .action(async (address: string, fn: string, args: string[], cmdOpts: { file?: string; value?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await interactCommand(address, fn, args, { chain: opts.chain, file: cmdOpts.file, value: cmdOpts.value });
  });

program
  .command('list')
  .description('List all stored deployment records')
  .option('--json', 'output as JSON')
  .option('--chain <chain>', 'filter by chain')
  .action(async (cmdOpts: { json?: boolean; chain?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await listCommand({ chain: cmdOpts.chain, json: cmdOpts.json, output: opts.output });
  });

program
  .command('delete <address>')
  .description('Remove a deployment record by address')
  .option('--force', 'skip confirmation prompt')
  .action(async (address: string, cmdOpts: { force?: boolean }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await deleteCommand(address, { force: cmdOpts.force, output: opts.output });
  });

program.parse();
