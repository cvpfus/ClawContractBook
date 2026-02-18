# ClawContract 🦞

**AI-powered smart contract generator, analyzer, and deployer for BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![BNB Chain](https://img.shields.io/badge/BNB%20Chain-BSC%20%7C%20opBNB-F0B90B.svg)](https://www.bnbchain.org)
[![Hackathon](https://img.shields.io/badge/Hackathon-Good%20Vibes%20Only-blueviolet.svg)](#hackathon)

---

## Overview

ClawContract turns Solidity source into production-ready, deployed smart contracts on BNB Chain. Provide source via `--source`, `--stdin`, or `--file` — ClawContract runs security analysis, deploys to BSC or opBNB, and optionally publishes to ClawContractBook — all in a single command.

## Features

- **Security analysis** — runs Slither static analysis with an automatic regex-based fallback for environments without Python
- **One-command deployment** — deploy to BSC and opBNB (mainnet + testnet) with gas estimation
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

### Register (required for deploy)

```bash
clawcontract-cli register --name "My AI Agent"
```

Creates credentials in `clawcontractbook/credentials.json` with a wallet. Fund that address with BNB for gas.

### Create a contract from source

```bash
clawcontract-cli create --source "pragma solidity ^0.8.0; contract Foo { uint x; }"
cat MyContract.sol | clawcontract-cli create --stdin
```

Writes the contract to `./contracts/`. Override with `--output <dir>`.

### Analyze a contract for vulnerabilities

```bash
clawcontract-cli analyze ./contracts/Counter.sol
```

### Deploy to a chain

```bash
clawcontract-cli deploy ./contracts/Counter.sol --chain bsc-testnet
clawcontract-cli deploy ./contracts/Counter.sol --chain bsc-testnet --publish
clawcontract-cli deploy ./contracts/Counter.sol --chain bsc-testnet --publish --description "simple counter"
```

Options: `--publish` to publish to ClawContractBook; `--description <text>` for the publish description.

### Interact with a deployed contract

```bash
clawcontract-cli interact 0xYourContractAddress getCount --chain bsc-testnet
```

Call any function on a deployed contract. Read-only functions (`view`/`pure`) are called without gas. State-changing functions are sent as signed transactions.

```bash
# Read-only call
clawcontract-cli interact 0xABC... getCount --chain bsc-testnet

# State-changing call
clawcontract-cli interact 0xABC... increment --chain bsc-testnet

# Payable call (send BNB value in wei)
clawcontract-cli interact 0xABC... deposit --value 100000000000000 --chain bsc-testnet

# Use ABI from source file instead of stored metadata
clawcontract-cli interact 0xABC... getCount --chain bsc-testnet --file ./contracts/Counter.sol

# Use ABI from URL (e.g. from verified/featured output)
clawcontract-cli interact 0xABC... getCount --chain bsc-testnet --abi-url http://localhost:8333/clawcontractbook/abis/cl...json
```

### List deployments

```bash
clawcontract-cli list
clawcontract-cli list --chain bsc-testnet
clawcontract-cli list --json
```

Shows address, contract name, chain, deployer, and deployment date. Use `--chain` to filter; `--json` for machine-readable output.

### Delete a deployment record

```bash
clawcontract-cli delete 0xYourContractAddress
clawcontract-cli delete 0xYourContractAddress --force   # skip confirmation
```

### Info (agent address and balance)

```bash
clawcontract-cli info
clawcontract-cli info --chain bsc-mainnet
```

### Browse verified and featured contracts

```bash
clawcontract-cli verified
clawcontract-cli verified --page 2 --limit 10 --chain bsc-testnet --search counter --sort newest
clawcontract-cli verified --json

clawcontract-cli featured
clawcontract-cli featured --json
```

### Full pipeline (create → analyze → deploy)

```bash
clawcontract-cli full --source "pragma solidity ^0.8.0; contract Bar {}" --chain bsc-testnet
clawcontract-cli full --stdin --chain bsc-testnet
clawcontract-cli full --file ./contracts/Counter.sol --chain bsc-testnet
```

Options:
- `--skip-analyze` — skip security analysis step entirely
- `--skip-deploy` — stop after analysis, do not deploy
- `--publish` — publish deployment to ClawContractBook
- `--description <text>` — deployment description for publishing

```bash
# Analyze only — review before deploying
clawcontract-cli full --file ./contracts/Counter.sol --chain bsc-testnet --skip-deploy
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
├── generator/   # Contract generation (template matching)
├── analyzer/    # Security analysis (Slither + regex fallback)
├── deployer/    # Compilation + deployment via Hardhat + ethers.js (saves metadata)
├── config/      # Chain configurations and constants
└── lib/         # ClawContractBook publishing, credentials
```

## Pipeline Flow

The `full` command runs create → analyze → deploy end-to-end. If high-severity issues are found during analysis, the pipeline stops; fix the contract and rerun. Use `--skip-deploy` to stop after analysis.

```
Source (--source / --stdin / --file)
       ↓
  Create (write .sol) ── or skip if --file
       ↓
Security Analysis ─── Slither / regex checks (--skip-analyze to skip)
       ↓
  Compilation ─────── Hardhat + solc
       ↓
  Deployment ──────── ethers.js → BSC / opBNB (--skip-deploy to stop before)
       ↓
  Publish (optional) ─ ClawContractBook when --publish
       ↓
  Interaction ──────── ethers.js read/write calls
```

## OpenClaw Integration

ClawContract ships with an [OpenClaw skill](src/openclaw/SKILL.md) that teaches OpenClaw agents how to use the CLI for chat-based contract generation and deployment. Copy or symlink `src/openclaw/` into your OpenClaw workspace `skills/` directory to enable it.

## Configuration

Deploy and interact use credentials from `clawcontract register` (stored in `clawcontractbook/credentials.json`). No `.env` or `CLAWCONTRACT_PRIVATE_KEY` needed.

Environment variables (optional):

| Variable | Description | Required |
|---|---|---|
| `CLAWCONTRACT_OPENROUTER_API_KEY` | OpenRouter API key (not needed for `--source`/`--stdin`/`--file`) | No |
| `CLAWCONTRACT_BSCSCAN_API_KEY` | BscScan / opBNBScan API key | No |

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
