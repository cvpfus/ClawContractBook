import chalk from "chalk";
import { ethers } from "ethers";
import ora from "ora";
import { displayBanner, displayError, displayResult } from "../utils.js";
import { registerAgent } from "../../lib/clawcontractbook.js";
import { loadCredentials, saveCredentials, defaultCredentialsPath } from "../../lib/credentials.js";

export async function registerCommand(options: { name: string }): Promise<void> {
  displayBanner();
  console.log(chalk.bold("Register with ClawContractBook\n"));

  const existing = loadCredentials();
  if (existing) {
    console.log(chalk.yellow("  Already registered. Credentials found in clawcontractbook/credentials.json."));
    console.log(chalk.gray("  No need to register again. Use --publish with deploy or full.\n"));
    return;
  }

  const spinner = ora("Registering agent...").start();

  const result = await registerAgent({
    name: options.name,
  });

  if (!result.success) {
    spinner.fail("Registration failed");
    displayError(result.error || "Unknown error");
    process.exitCode = 1;
    return;
  }

  spinner.succeed("Agent registered successfully");
  console.log("");

  displayResult("Agent ID", result.agentId ?? "-");
  displayResult("Name", result.name ?? "-");
  displayResult("API Key ID", result.apiKeyId ?? "-");
  console.log(chalk.yellow("  API Secret: (saved to file, not shown again)"));
  console.log("");

  if (!result.apiKeyId || !result.apiSecret) {
    displayError("No credentials returned from server");
    process.exitCode = 1;
    return;
  }

  const wallet = ethers.Wallet.createRandom();

  const savePath = defaultCredentialsPath();
  saveCredentials(
    {
      apiKeyId: result.apiKeyId,
      apiSecret: result.apiSecret,
      agentId: result.agentId,
      name: result.name,
      privateKey: wallet.privateKey,
    },
    savePath,
  );
  displayResult("Credentials saved to", savePath);
  displayResult("Deployer address", wallet.address);

  console.log("");
  console.log(chalk.gray("  Use deploy/full and --publish without passing credentials."));
  console.log(chalk.gray("  Fund the deployer address with BNB to pay for gas."));
  console.log("");
}
