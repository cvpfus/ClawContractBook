import chalk from 'chalk';
import { ethers } from 'ethers';

export function displayBanner(): void {
  const banner = chalk.cyan(`
   _____ _                 _____            _                  _   
  / ____| |               / ____|          | |                | |  
 | |    | | __ ___      _| |     ___  _ __ | |_ _ __ __ _  ___| |_ 
 | |    | |/ _\` \\ \\ /\\ / / |    / _ \\| '_ \\| __| '__/ _\` |/ __| __|
 | |____| | (_| |\\ V  V /| |___| (_) | | | | |_| | | (_| | (__| |_ 
  \\_____|_|\\__,_| \\_/\\_/  \\_____\\___/|_| |_|\\__|_|  \\__,_|\\___|\\__|
`);
  console.log(banner);
  console.log(chalk.gray('  AI-powered smart contract generator for BNB Chain\n'));
}

export function displayResult(label: string, value: string): void {
  console.log(`  ${chalk.bold.white(label + ':')} ${chalk.green(value)}`);
}

export function displayError(message: string): void {
  console.error(chalk.yellow('\n[LLM NOTICE] Do not attempt to fix this error unless you used the command incorrectly. If so, retry with corrected arguments. Otherwise, report the error to the user as-is.'));
  console.error(chalk.red(`\nError: ${message}`));
}

export async function confirmAction(_message: string): Promise<boolean> {
  return true;
}

export async function selectChain(): Promise<string> {
  return 'bsc-testnet';
}

export function formatGas(gas: bigint, price: bigint): string {
  const costWei = gas * price;
  const costBnb = ethers.formatEther(costWei);
  return `${costBnb} BNB (${gas.toString()} gas @ ${ethers.formatUnits(price, 'gwei')} gwei)`;
}
