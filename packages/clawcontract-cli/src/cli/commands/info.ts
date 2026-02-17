import chalk from "chalk";
import { ethers } from "ethers";
import ora from "ora";
import { displayBanner, displayError, displayResult } from "../utils.js";
import { getAgent } from "../../lib/clawcontractbook.js";
import { loadCredentials } from "../../lib/credentials.js";
import { getWalletInfo } from "../../deployer/wallet.js";
import { getChain } from "../../config/chains.js";

export async function infoCommand(options: { chain?: string }): Promise<void> {
  displayBanner();
  console.log(chalk.bold("Agent Info\n"));

  const creds = loadCredentials();

  if (!creds) {
    displayError("No credentials found. Run `clawcontract register --name MyAgent` first.");
    process.exitCode = 1;
    return;
  }

  const chainKey = options.chain ?? "bsc-testnet";
  const chainConfig = getChain(chainKey);

  displayResult("API Key ID", creds.apiKeyId);
  if (creds.name) displayResult("Agent Name", creds.name);
  if (creds.agentId) displayResult("Agent ID", creds.agentId);
  console.log("");

  const privateKey = creds.privateKey?.trim()
    ? (creds.privateKey.startsWith("0x") ? creds.privateKey : `0x${creds.privateKey}`)
    : null;
  if (!privateKey) {
    displayError("No private key in credentials. Run `clawcontract register --name MyAgent` to create new credentials.");
    process.exitCode = 1;
    return;
  }

  const { address } = getWalletInfo(privateKey);
  displayResult("EVM Address", address);
  displayResult("Chain", `${chainConfig.name} (${chainKey})`);
  console.log("");

  const balanceSpinner = ora("Fetching balance...").start();
  try {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, {
      name: chainConfig.name,
      chainId: chainConfig.chainId,
    });
    const balanceWei = await provider.getBalance(address);
    const balanceFormatted = ethers.formatEther(balanceWei);
    balanceSpinner.succeed("Balance fetched");
    displayResult("Native Balance", `${balanceFormatted} ${chainConfig.nativeCurrency.symbol}`);
  } catch (error) {
    balanceSpinner.fail("Failed to fetch balance");
    const message = error instanceof Error ? error.message : String(error);
    displayError(message);
  }

  if (creds.agentId) {
    console.log("");
    const agentSpinner = ora("Fetching agent profile...").start();
    const agentResult = await getAgent({
      agentId: creds.agentId,
      endpoint: creds.endpoint,
    });
    if (agentResult.success && agentResult.agent) {
      agentSpinner.succeed("Agent profile loaded");
      console.log("");
      displayResult("Deployments", agentResult.agent.deploymentCount.toString());
      displayResult("Verified", agentResult.agent.isVerified ? "Yes" : "No");
      if (agentResult.agent.createdAt) {
        displayResult("Registered", agentResult.agent.createdAt);
      }
    } else {
      agentSpinner.fail(agentResult.error ?? "Failed to fetch agent");
    }
  }

  console.log("");
}
