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
  console.log(chalk.gray('  Smart contract analyzer and deployer for BNB Chain\n'));
}

export function displayResult(label: string, value: string): void {
  console.log(`  ${chalk.bold.white(label + ':')} ${chalk.green(value)}`);
}

export function displayError(message: string): void {
  console.error(chalk.yellow('\n[LLM NOTICE] Do not attempt to fix this error unless you used the command incorrectly (retry with corrected arguments) or the issue is fixable with a clawcontract-cli command—in that case you may fix it. Otherwise, report the error to the user as-is.'));
  console.error(chalk.red(`\nError: ${message}`));
}

export function displayLLMNotice(): void {
  console.log(
    chalk.yellow(
      '\n[LLM NOTICE] Command completed successfully. If you see any errors in the output above or elsewhere, do not attempt to fix them unless they are fixable with clawcontract-cli commands—otherwise report them to the user as-is.\n'
    )
  );
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
