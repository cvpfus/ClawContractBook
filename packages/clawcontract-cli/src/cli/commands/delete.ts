import chalk from 'chalk';
import readline from 'node:readline';
import { loadDeployment, deleteDeployment } from '../../deployer/metadata.js';
import { displayError, displayResult } from '../utils.js';

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export async function deleteCommand(
  address: string,
  options: { force?: boolean; output: string },
): Promise<void> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    displayError('Invalid address format. Expected 0x followed by 40 hex characters.');
    process.exitCode = 1;
    return;
  }

  const deployment = loadDeployment(address, options.output);
  if (!deployment) {
    displayError('No deployment found for address: ' + address);
    process.exitCode = 1;
    return;
  }

  displayResult('Address', deployment.contractAddress);
  displayResult('Contract', deployment.contractName);
  displayResult('Chain', deployment.chainKey);
  displayResult('Deployer', deployment.deployer);
  displayResult('Deployed At', deployment.deployedAt);

  console.log();

  if (!options.force) {
    const confirmed = await confirm(chalk.yellow('Remove this deployment? (y/N) '));
    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  const removed = deleteDeployment(address, options.output);
  if (removed) {
    console.log(chalk.green('✓ Deployment removed.'));
  } else {
    displayError('Failed to remove deployment.');
    process.exitCode = 1;
  }
}
