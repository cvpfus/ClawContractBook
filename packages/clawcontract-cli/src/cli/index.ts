#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { displayBanner, displayLLMNotice } from './utils.js';
import { createCommand } from './commands/create.js';
import { analyzeCommand } from './commands/analyze.js';
import { deployCommand } from './commands/deploy.js';
import { fullCommand } from './commands/full.js';
import { interactCommand } from './commands/interact.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { registerCommand } from './commands/register.js';
import { infoCommand } from './commands/info.js';
import { featuredCommand } from './commands/featured.js';
import { verifiedCommand } from './commands/verified.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('clawcontract')
  .description('Smart contract analyzer and deployer for BNB Chain')
  .version(pkg.version)
  .option('--chain <chain>', 'target blockchain', 'bsc-testnet')
  .option('--output <dir>', 'output directory for generated contracts', './contracts')
  .hook('preAction', () => {
    displayBanner();
  });

program
  .command('create')
  .description('Create a smart contract from supplied source')
  .option('--source <code>', 'Solidity source code')
  .option('--stdin', 'read Solidity source from stdin')
  .action(async (cmdOpts: { source?: string; stdin?: boolean }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    if (!cmdOpts.source && !cmdOpts.stdin) {
      console.error('Error: Provide Solidity source via --source <code> or --stdin.');
      process.exit(1);
    }
    await createCommand({ ...opts, source: cmdOpts.source, stdin: cmdOpts.stdin });
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
  .option('--description <text>', 'Deployment description')
  .action(async (file: string, cmdOpts: { publish?: boolean; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await deployCommand(file, {
      chain: opts.chain,
      publish: cmdOpts.publish,
      description: cmdOpts.description,
    });
    displayLLMNotice();
  });

program
  .command('full')
  .description('Full pipeline: create → analyze → deploy')
  .option('--source <code>', 'use supplied Solidity source')
  .option('--stdin', 'read Solidity source from stdin')
  .option('--file <path>', 'use existing Solidity file (skip create step)')
  .option('--skip-deploy', 'Stop after analysis — do not deploy')
  .option('--skip-analyze', 'Skip security analysis step entirely')
  .option('--publish', 'Publish to ClawContractBook')
  .option('--description <text>', 'Deployment description')
  .action(async (cmdOpts: { source?: string; stdin?: boolean; file?: string; skipDeploy?: boolean; skipAnalyze?: boolean; publish?: boolean; description?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    const hasInput = !!cmdOpts.source || !!cmdOpts.stdin || !!cmdOpts.file;
    if (!hasInput) {
      console.error('Error: Provide Solidity source via --source, --stdin, or --file.');
      process.exit(1);
    }
    await fullCommand(
      { source: cmdOpts.source, stdin: cmdOpts.stdin, file: cmdOpts.file },
      { ...opts, skipDeploy: cmdOpts.skipDeploy, skipAnalyze: cmdOpts.skipAnalyze, publish: cmdOpts.publish, description: cmdOpts.description },
    );
    displayLLMNotice();
  });

program
  .command('interact <address> <function> [args...]')
  .description('Interact with a deployed contract (call read/write functions)')
  .option('--file <file>', 'source Solidity file for ABI resolution')
  .option('--abi-url <url>', 'fetch ABI from URL (e.g. from verified/featured output)')
  .option('--value <value>', 'BNB value to send (in wei) for payable functions')
  .action(async (address: string, fn: string, args: string[], cmdOpts: { file?: string; abiUrl?: string; value?: string }) => {
    const opts = program.opts<{ chain: string; output: string }>();
    await interactCommand(address, fn, args, { chain: opts.chain, file: cmdOpts.file, abiUrl: cmdOpts.abiUrl, value: cmdOpts.value });
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
  .command('info')
  .description('Show agent info, EVM address, and native balance')
  .option('--chain <chain>', 'chain for balance lookup', 'bsc-testnet')
  .action(async (cmdOpts: { chain?: string }) => {
    const opts = program.opts<{ chain: string }>();
    await infoCommand({ chain: cmdOpts.chain ?? opts.chain });
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
  .command('verified')
  .description('Browse verified deployments from ClawContractBook')
  .option('--page <number>', 'page number', '1')
  .option('--limit <number>', 'results per page', '20')
  .option('--chain <chain>', 'filter by chain')
  .option('--search <query>', 'search by name or description')
  .option('--sort <sort>', 'sort order: newest, oldest, name', 'newest')
  .option('--json', 'output as JSON')
  .action(async (cmdOpts: { page: string; limit: string; chain?: string; search?: string; sort?: string; json?: boolean }) => {
    await verifiedCommand({
      page: parseInt(cmdOpts.page, 10),
      limit: parseInt(cmdOpts.limit, 10),
      chain: cmdOpts.chain,
      search: cmdOpts.search,
      sort: cmdOpts.sort,
      json: cmdOpts.json,
    });
    displayLLMNotice();
  });

program
  .command('featured')
  .description('Show featured verified deployments from ClawContractBook')
  .option('--json', 'output as JSON')
  .action(async (cmdOpts: { json?: boolean }) => {
    await featuredCommand({ json: cmdOpts.json });
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
