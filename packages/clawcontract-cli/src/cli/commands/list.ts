import chalk from 'chalk';
import { loadAllDeployments } from '../../deployer/metadata.js';
import { displayBanner, displayResult } from '../utils.js';

export async function listCommand(options: {
  chain?: string;
  json?: boolean;
  output: string;
}): Promise<void> {
  let records = loadAllDeployments(options.output);

  if (options.chain) {
    records = records.filter((r) => r.chainKey === options.chain);
  }

  if (options.json) {
    const slim = records.map(({ abi, ...rest }) => rest);
    console.log(JSON.stringify(slim, null, 2));
    return;
  }

  console.log(chalk.bold('Deployments\n'));

  if (records.length === 0) {
    if (options.chain) {
      console.log(`No deployments found for chain: ${options.chain}`);
    } else {
      console.log('No deployments found.');
    }
    return;
  }

  displayResult('Total', records.length.toString());
  console.log();

  records.forEach((r, i) => {
    displayResult('Address', r.contractAddress);
    displayResult('Contract', r.contractName);
    displayResult('Chain', r.chainKey);
    displayResult('Deployer', r.deployer);
    displayResult('Deployed At', r.deployedAt);

    if (i < records.length - 1) {
      console.log(chalk.gray('  ─'.repeat(20)));
    }
  });
}
