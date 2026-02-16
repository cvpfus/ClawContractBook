# ClawContract 🦞

**AI-powered smart contract generator, analyzer, and deployer for BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![BNB Chain](https://img.shields.io/badge/BNB%20Chain-BSC%20%7C%20opBNB-F0B90B.svg)](https://www.bnbchain.org)
[![Hackathon](https://img.shields.io/badge/Hackathon-Good%20Vibes%20Only-blueviolet.svg)](#hackathon)

---

## Overview

ClawContract turns natural language into production-ready, deployed, and verified smart contracts on BNB Chain. Describe what you want in plain English — ClawContract generates the Solidity code using AI, runs security analysis, deploys to BSC or opBNB, and verifies the source on BscScan — all in a single command.

## Features

- **Security analysis** — runs Slither static analysis with an automatic regex-based fallback for environments without Python
- **One-command deployment** — deploy to BSC and opBNB (mainnet + testnet) with gas estimation
- **Automatic verification** — verify source code on BscScan and opBNBScan immediately after deployment
- **Non-interactive CLI** — fully automated pipeline with gas estimates, no user prompts required
- **OpenClaw skill integration** — register as an OpenClaw skill for chat-based contract generation and deployment

## Quick Start

```bash
git clone https://github.com/your-username/ClawContract.git
cd ClawContract
pnpm install
pnpm run build
```

## Usage

### Generate a contract

```bash
# AI generation (requires CLAWCONTRACT_OPENROUTER_API_KEY)
clawcontract-cli generate "ERC-20 token called VibeToken with 1M supply"

# From your own source (no AI)
clawcontract-cli generate --source "pragma solidity ^0.8.0; contract Foo { uint x; }"
cat MyContract.sol | clawcontract-cli generate --stdin
```

### Analyze a contract for vulnerabilities

```bash
clawcontract-cli analyze ./contracts/VibeToken.sol
```

### Deploy to a chain

```bash
clawcontract-cli deploy ./contracts/VibeToken.sol --chain bsc-testnet
```

### Verify on block explorer

```bash
clawcontract-cli verify 0xYourContractAddress --chain bsc-testnet --file ./contracts/VibeToken.sol
```

### Interact with a deployed contract

```bash
clawcontract-cli interact 0xYourContractAddress name --chain bsc-testnet
```

Call any function on a deployed contract. Read-only functions (`view`/`pure`) are called without gas. State-changing functions are sent as signed transactions.

```bash
# Read-only call
clawcontract-cli interact 0xABC... balanceOf 0xDEF... --chain bsc-testnet

# State-changing call
clawcontract-cli interact 0xABC... transfer 0xDEF... 1000 --chain bsc-testnet

# Payable call (send BNB value in wei)
clawcontract-cli interact 0xABC... fundTrade 1 --value 100000000000000 --chain bsc-testnet

# Use ABI from source file instead of stored metadata
clawcontract-cli interact 0xABC... name --chain bsc-testnet --file ./contracts/VibeToken.sol
```

### List deployments

```bash
clawcontract-cli list
```

List all stored deployment records. Shows address, contract name, chain, deployer, and deployment date.

```bash
# List all deployments
clawcontract-cli list

# Filter by chain
clawcontract-cli list --chain bsc-testnet

# Output as JSON (for scripting)
clawcontract-cli list --json
```

### Delete a deployment record

```bash
clawcontract-cli delete <address>
```

Remove a deployment record from the local store. Shows deployment details and asks for confirmation before deleting. Orphaned ABI files are automatically cleaned up.

```bash
# Delete with confirmation prompt
clawcontract-cli delete 0xYourContractAddress

# Skip confirmation
clawcontract-cli delete 0xYourContractAddress --force
```

### Full pipeline (generate → analyze → deploy → verify)

```bash
# AI generation
clawcontract-cli full "staking contract for BNB with 10% APY" --chain bsc-testnet

# Your own source or file (no AI)
clawcontract-cli full --source "pragma solidity ^0.8.0; contract Bar {}" --chain bsc-testnet
clawcontract-cli full --file ./contracts/MyToken.sol --chain bsc-testnet
```

Optional flags:
- `--skip-analyze` — skip security analysis step entirely (proceed directly to deployment)
- `--skip-deploy` — stop after analysis, do not deploy or verify (useful for review before deploying)
- `--skip-fix` — do not auto-fix high-severity issues found during analysis

```bash
# Generate and analyze only — review before deploying
clawcontract-cli full "staking contract for BNB with 10% APY" --chain bsc-testnet --skip-deploy
```

### Global options

| Option | Description | Default |
|---|---|---|
| `--chain <chain>` | Target blockchain | `bsc-testnet` |
| `--output <dir>` | Output directory for generated contracts | `./contracts` |

## Supported Chains

| Chain | Chain ID | RPC | Explorer |
|---|---|---|---|
| BNB Smart Chain | 56 | `https://bsc-dataseed.binance.org` | [bscscan.com](https://bscscan.com) |
| BNB Smart Chain Testnet | 97 | `https://data-seed-prebsc-1-s1.binance.org:8545` | [testnet.bscscan.com](https://testnet.bscscan.com) |
| opBNB | 204 | `https://opbnb-mainnet-rpc.bnbchain.org` | [opbnbscan.com](https://opbnbscan.com) |
| opBNB Testnet | 5611 | `https://opbnb-testnet-rpc.bnbchain.org` | [testnet.opbnbscan.com](https://testnet.opbnbscan.com) |

## Architecture

```
src/
├── cli/         # Commander.js CLI entry point + command handlers
├── generator/   # Contract generation (template matching + Claude LLM)
├── analyzer/    # Security analysis (Slither + regex fallback)
├── deployer/    # Compilation + deployment via Hardhat + ethers.js (saves metadata)
├── verifier/    # BscScan / opBNBScan source verification
├── config/      # Chain configurations and constants
└── openclaw/    # OpenClaw skill definition for chat integration
```

## Pipeline Flow

The `full` command runs the entire pipeline end-to-end. If high-severity issues are found during analysis, the AI will automatically attempt to fix them (up to 3 attempts) before proceeding to deployment. Use `--skip-deploy` to stop after analysis, or `--skip-fix` to disable automatic fix attempts.

```
Natural Language
       ↓
  AI Generation ─── template matching + Claude LLM
       ↓
Security Analysis ── Slither / regex checks
       ↓              ↑
  AI Auto-Fix ────────┘  (up to 3 attempts if high-severity issues found)
       ↓
  Compilation ────── Hardhat + solc
       ↓
  Deployment ─────── ethers.js → BSC / opBNB
       ↓
  Verification ───── BscScan / opBNBScan API
       ↓
  Interaction ────── ethers.js read/write calls
```

## OpenClaw Integration

ClawContract ships with an [OpenClaw skill](src/openclaw/SKILL.md) that teaches OpenClaw agents how to use the CLI for chat-based contract generation and deployment. Copy or symlink `src/openclaw/` into your OpenClaw workspace `skills/` directory to enable it.

## Configuration

Environment variables are configured via `docker-compose.yml` or set directly in your environment.

| Variable | Description | Required |
|---|---|---|
| `CLAWCONTRACT_PRIVATE_KEY` | Wallet private key for deployment (required for deploy/full) | Yes (for deploy) |
| `CLAWCONTRACT_OPENROUTER_API_KEY` | OpenRouter API key for AI contract generation (not needed for `--source`/`--stdin`/`--file`) | For AI generate |
| `CLAWCONTRACT_OPENROUTER_MODEL` | OpenRouter model (default: `anthropic/claude-sonnet-4-20250514`) | No |
| `CLAWCONTRACT_BSCSCAN_API_KEY` | BscScan / opBNBScan API key for contract verification | No |

> **Security:** Never commit secrets to version control. When using Docker, set values in `docker-compose.yml` or pass them via environment variables.

> **Data:** Deployment metadata is saved to `contracts/.deployments/` using a directory-based store with deduplicated ABIs and an index for fast lookups. Legacy `.deployments.json` files are auto-migrated on first access. This directory is local and should not be committed.

## Requirements

- **Node.js** 20.0.0 or later
- **pnpm** (recommended package manager)
- **Python 3.8+** (optional — required for Slither static analysis; regex fallback is used if unavailable)

## Hackathon

Built for the **Good Vibes Only: OpenClaw Edition** hackathon.

- **Track:** Builders' Tools
- **Chain:** BNB Chain (BSC + opBNB)
- **Goal:** Make smart contract development accessible to everyone through AI and natural language

## License

[MIT](LICENSE)
