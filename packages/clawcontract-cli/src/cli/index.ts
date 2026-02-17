#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { displayBanner, displayLLMNotice } from './utils.js';
import { generateCommand } from './commands/generate.js';
import { analyzeCommand } from './commands/analyze.js';
import { deployCommand } from './commands/deploy.js';
import { verifyCommand } from './commands/verify.js';
import { fullCommand } from './commands/full.js';
import { interactCommand } from './commands/interact.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { registerCommand } from './commands/register.js';

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
  .command('generate [description]')
  .description('Generate a smart contract from natural language or supplied source')
  .option('--source <code>', 'use supplied Solidity source instead of AI generation')
  .option('--stdin', 'read Solidity source from stdin')
  .action(async (description: string | undefined, cmdOpts: { source?: string; stdin?: boolean }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    const hasDirectSource = !!cmdOpts.source || !!cmdOpts.stdin;
    if (!hasDirectSource && !description) {
      console.error('Error: Provide either a description (for AI) or --source / --stdin (for your own contract).');
      process.exit(1);
    }
    if (hasDirectSource && description) {
      console.error('Error: Use either a description (for AI) or --source/--stdin (for your own contract), not both.');
      process.exit(1);
    }
    await generateCommand(description, { ...opts, source: cmdOpts.source, stdin: cmdOpts.stdin });
    displayLLMNotice();
  });

program
  .command('analyze <file>')
  .description('Run security analysis on a Solidity file')
  .action(async (file: string) => {
    await analyzeCommand(file);
    displayLLMNotice();
  });

program
  .command('deploy <file>')
  .description('Deploy a contract to BSC/opBNB')
  .option('--publish', 'Publish to ClawContractBook')
  .option('--api-key <id>', 'ClawContractBook API key (or use saved credentials from register)')
  .option('--api-secret <secret>', 'ClawContractBook API secret (or use saved credentials from register)')
  .option('--description <text>', 'Deployment description')
  .action(async (file: string, cmdOpts: { publish?: boolean; apiKey?: string; apiSecret?: string; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await deployCommand(file, {
      chain: opts.chain,
      publish: cmdOpts.publish,
      apiKeyId: cmdOpts.apiKey,
      apiSecret: cmdOpts.apiSecret,
      description: cmdOpts.description,
    });
    displayLLMNotice();
  });

program
  .command('verify <address>')
  .description('Verify a deployed contract on block explorer')
  .option('--file <file>', 'source Solidity file')
  .action(async (address: string, cmdOpts: { file?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await verifyCommand(address, { chain: opts.chain, file: cmdOpts.file ?? '' });
    displayLLMNotice();
  });

program
  .command('full [description]')
  .description('Full pipeline: generate → analyze → deploy → verify')
  .option('--source <code>', 'use supplied Solidity source instead of AI generation')
  .option('--stdin', 'read Solidity source from stdin')
  .option('--file <path>', 'use existing Solidity file (skip generate step)')
  .option('--skip-deploy', 'Stop after analysis — do not deploy or verify')
  .option('--skip-fix', 'Do not auto-fix high-severity issues')
  .option('--skip-analyze', 'Skip security analysis step entirely')
  .option('--publish', 'Publish to ClawContractBook')
  .option('--api-key <id>', 'ClawContractBook API key (or use saved credentials from register)')
  .option('--api-secret <secret>', 'ClawContractBook API secret (or use saved credentials from register)')
  .option('--description <text>', 'Deployment description')
  .action(async (description: string | undefined, cmdOpts: { source?: string; stdin?: boolean; file?: string; skipDeploy?: boolean; skipFix?: boolean; skipAnalyze?: boolean; publish?: boolean; apiKey?: string; apiSecret?: string; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    const hasDirectInput = !!cmdOpts.source || !!cmdOpts.stdin || !!cmdOpts.file;
    if (!hasDirectInput && !description) {
      console.error('Error: Use either a description (for AI), or --source / --stdin / --file (for your own contract).');
      process.exit(1);
    }
    if (hasDirectInput && description) {
      console.error('Error: Use either a description (for AI) or --source/--stdin/--file (for your own contract), not both.');
      process.exit(1);
    }
    await fullCommand(
      { description, source: cmdOpts.source, stdin: cmdOpts.stdin, file: cmdOpts.file },
      { ...opts, skipDeploy: cmdOpts.skipDeploy, skipFix: cmdOpts.skipFix, skipAnalyze: cmdOpts.skipAnalyze, publish: cmdOpts.publish, apiKeyId: cmdOpts.apiKey, apiSecret: cmdOpts.apiSecret, description: cmdOpts.description },
    );
    displayLLMNotice();
  });

program
  .command('interact <address> <function> [args...]')
  .description('Interact with a deployed contract (call read/write functions)')
  .option('--file <file>', 'source Solidity file for ABI resolution')
  .option('--value <value>', 'BNB value to send (in wei) for payable functions')
  .option('--api-key <id>', 'ClawContractBook API key (to record interaction)')
  .option('--api-secret <secret>', 'ClawContractBook API secret (to record interaction)')
  .action(async (address: string, fn: string, args: string[], cmdOpts: { file?: string; value?: string; apiKey?: string; apiSecret?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await interactCommand(address, fn, args, { chain: opts.chain, file: cmdOpts.file, value: cmdOpts.value, apiKeyId: cmdOpts.apiKey, apiSecret: cmdOpts.apiSecret });
    displayLLMNotice();
  });

program
  .command('register')
  .description('Register agent with ClawContractBook and save credentials')
  .requiredOption('--name <name>', 'Agent name (3-100 chars)')
  .action(async (cmdOpts: { name: string }) => {
    await registerCommand({ name: cmdOpts.name });
    displayLLMNotice();
  });

program
  .command('list')
  .description('List all stored deployment records')
  .option('--json', 'output as JSON')
  .option('--chain <chain>', 'filter by chain')
  .action(async (cmdOpts: { json?: boolean; chain?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await listCommand({ chain: cmdOpts.chain, json: cmdOpts.json, output: opts.output });
    displayLLMNotice();
  });

program
  .command('delete <address>')
  .description('Remove a deployment record by address')
  .option('--force', 'skip confirmation prompt')
  .action(async (address: string, cmdOpts: { force?: boolean }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await deleteCommand(address, { force: cmdOpts.force, output: opts.output });
    displayLLMNotice();
  });

program.parse();
