import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { getChain } from '../../config/chains.js';
import { estimateGas, deployContract, compileContract, saveDeployment } from '../../deployer/index.js';
import type { DeployResult } from '../../deployer/index.js';
import { resolvePrivateKey, getWalletInfo } from '../../deployer/wallet.js';
import { displayBanner, displayError, displayResult } from '../utils.js';
import { publishDeployment, getClawContractBookConfig } from '../../lib/clawcontractbook.js';

export async function deployCommand(
  file: string,
  options: { chain: string; publish?: boolean },
): Promise<DeployResult | undefined> {
  displayBanner();
  console.log(chalk.bold('Deploy Contract\n'));

  const filePath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    displayError(`File not found: ${filePath}`);
    process.exitCode = 1;
    return undefined;
  }

  displayResult('Contract', filePath);

  const chainKey = options.chain;
  const chainConfig = getChain(chainKey);
  displayResult('Chain', `${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
  console.log('');

  const privateKey = resolvePrivateKey();
  const { address: deployerAddress } = getWalletInfo(privateKey);
  displayResult('Deployer', deployerAddress);
  console.log('');

  const gasSpinner = ora('Estimating gas...').start();

  try {
    const gas = await estimateGas(filePath, chainKey, privateKey);
    gasSpinner.succeed('Gas estimation complete');
    console.log('');

    console.log(chalk.bold('  Gas Estimation:'));
    displayResult('  Gas Limit', gas.gasLimit.toString());
    displayResult('  Gas Price', `${gas.gasPrice.toString()} wei`);
    displayResult('  Estimated Cost', `${gas.totalCostBNB} BNB`);
    displayResult('  With 20% Buffer', `${gas.totalCostWithBuffer} BNB`);
    console.log('');
  } catch (error) {
    gasSpinner.fail('Gas estimation failed');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }

  if (!chainConfig.isTestnet) {
    console.log(chalk.red.bold('  ⚠ WARNING: You are deploying to MAINNET!'));
    console.log(chalk.red('  This will cost real BNB. Make sure you have reviewed the contract.\n'));
  }

  const spinner = ora('Deploying contract...').start();

  try {
    const result = await deployContract({
      sourceFile: filePath,
      chainKey,
      privateKey,
    });

    spinner.succeed('Contract deployed successfully');
    console.log('');

    displayResult('Contract Address', result.contractAddress);
    displayResult('Transaction Hash', result.transactionHash);
    displayResult('Gas Used', result.gasUsed);
    displayResult('Block Number', result.blockNumber.toString());
    displayResult('Deployer', result.deployer);
    displayResult('Explorer URL', result.explorerUrl);

    const compiled = await compileContract(filePath);
    const ccbConfig = getClawContractBookConfig();
    let deploymentId: string | undefined;

    if (ccbConfig.enabled && ccbConfig.apiKeyId && ccbConfig.apiSecret) {
      if (options.publish || ccbConfig.autoPublish) {
        const publishSpinner = ora('Publishing to ClawContractBook...').start();
        try {
          const publishResult = await publishDeployment({
            contractAddress: result.contractAddress,
            chainKey,
            chainId: chainConfig.chainId,
            contractName: compiled.contractName,
            abi: [...compiled.abi],
            deployerAddress: result.deployer,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            apiKeyId: ccbConfig.apiKeyId,
            apiSecret: ccbConfig.apiSecret,
            endpoint: ccbConfig.endpoint,
          });

          if (publishResult.success) {
            publishSpinner.succeed('Published to ClawContractBook');
            deploymentId = publishResult.deploymentId;
            if (publishResult.url) {
              displayResult('View at', publishResult.url);
            }
          } else {
            publishSpinner.fail(`Failed to publish: ${publishResult.error}`);
          }
        } catch (publishError) {
          publishSpinner.fail('Failed to publish to ClawContractBook');
        }
      }
    } else if (options.publish) {
      console.log(chalk.yellow('\n  ClawContractBook publishing not configured. Set CLAWCONTRACT_BOOK_ENABLED=true and provide API credentials.'));
    }

    saveDeployment({
      contractAddress: result.contractAddress,
      abi: compiled.abi,
      chainKey,
      contractName: compiled.contractName,
      sourceFile: filePath,
      deployer: result.deployer,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      deployedAt: new Date().toISOString(),
      deploymentId,
    }, path.dirname(filePath));

    return result;
  } catch (error) {
    spinner.fail('Deployment failed');
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
    throw error;
  }
}
