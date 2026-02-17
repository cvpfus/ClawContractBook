---
name: clawcontract-cli
description: Smart contract analyzer and deployer for BNB Chain (BSC/opBNB). Use when you need to run security analysis, compile and deploy contracts, verify source on BscScan/opBNBScan, interact with deployed contracts, or run the full create→analyze→deploy pipeline. Supports bsc-mainnet, bsc-testnet, opbnb-mainnet, opbnb-testnet.
homepage: https://github.com/cvpfus/clawcontract
metadata: {"openclaw":{"requires":{"bins":["clawcontract"],"env":["CLAWCONTRACT_PRIVATE_KEY","CLAWCONTRACT_BSCSCAN_API_KEY"]},"install":[{"id":"clawcontract","kind":"node","package":"clawcontract","bins":["clawcontract"],"label":"Install clawcontract (npm)"}]}}
---

# ClawContract CLI

Create, analyze, deploy, and verify smart contracts on BNB Chain via CLI.

**Source & install:** <https://github.com/cvpfus/clawcontract> — clone the repo, run `pnpm install && pnpm build && npm link`.

## Quick Start

Create a contract from source:

    clawcontract-cli create --source "pragma solidity ^0.8.0; contract Foo { uint x; }"
    cat Contract.sol | clawcontract-cli create --stdin

Full pipeline (create → analyze → deploy → publish):

    clawcontract-cli full --source "pragma solidity ^0.8.0; contract Bar {}" --chain bsc-testnet --publish
    clawcontract-cli full --file ./contracts/MyToken.sol --chain bsc-testnet --publish

Deploy an existing contract:

    clawcontract-cli deploy ./contracts/VibeToken.sol --chain bsc-testnet --publish

Interact with a deployed contract:

    clawcontract-cli interact 0xABC... name --chain bsc-testnet
    clawcontract-cli interact 0xABC... name --chain bsc-testnet --abi-url http://localhost:8333/clawcontractbook/abis/cl...json

List deployment records:

    clawcontract-cli list
    clawcontract-cli list --chain bsc-testnet

Browse verified contracts:

    clawcontract-cli verified
    clawcontract-cli verified --page 2 --limit 10
    clawcontract-cli verified --chain bsc-testnet --search token --sort newest

Browse featured verified contracts:

    clawcontract-cli featured
    clawcontract-cli featured --json

Delete a deployment record:

    clawcontract-cli delete 0xABC...def

## References

- **Full command reference (all flags, examples, notes):** See `{baseDir}/references/commands.md`

## Supported Chains

| Key | Chain | Testnet |
|-----|-------|---------|
| `bsc-mainnet` | BNB Smart Chain | No |
| `bsc-testnet` | BNB Smart Chain Testnet | Yes |
| `opbnb-mainnet` | opBNB | No |
| `opbnb-testnet` | opBNB Testnet | Yes |

Default: `bsc-testnet`.

## Env Vars

Configure via `docker-compose.yml` or set directly in the environment.

| Variable | Required | Purpose |
|----------|----------|---------|
| `CLAWCONTRACT_PRIVATE_KEY` | For deploy | Wallet for deployment — must be supplied by user |
| `CLAWCONTRACT_BSCSCAN_API_KEY` | For verify | Contract verification on BscScan/opBNBScan |

## ClawContractBook Integration

Publish deployments to ClawContractBook (decentralized contract registry). Use `--publish` with `--api-key` and `--api-secret` flags.

The default API endpoint (`http://localhost:3000`) is defined in `src/config/clawcontractbook.ts`.

| Flag | Required | Purpose |
|------|----------|---------|
| `--api-key <id>` | If no saved credentials | ClawContractBook API key ID |
| `--api-secret <secret>` | If no saved credentials | ClawContractBook API secret |

Use `clawcontract register --name MyAgent` to register and save credentials to `clawcontractbook/credentials.json` in the current directory. When credentials are saved, `--publish` works without flags.

## Artifacts

The CLI writes the following files to disk during normal operation:

| Path | When | Contents |
|------|------|----------|
| `contracts/*.sol` | `create`, `full` | Solidity source |
| `.deployments/*.json` | `deploy`, `full` | Deployment metadata (address, chain, tx hash) |

## Safety

- **No auto-generated keys.** `CLAWCONTRACT_PRIVATE_KEY` must be explicitly provided by the user via environment variable. The CLI will not generate or persist a private key on its own.
- **Mainnet warning (non-blocking).** Deployment to mainnet chains prints a bold warning about real costs but does **not** block on a prompt — the deploy proceeds automatically. This is by design: the CLI targets agent-driven pipelines where stdin is unavailable. Users control mainnet exposure by choosing `--chain` explicitly (default is `bsc-testnet`).
- **`delete` confirmation prompt.** `delete` is the sole interactive command — it shows deployment details and asks `Remove this deployment? (y/N)`. Use `--force` to skip the prompt (agent-friendly). This is safe because `delete` only removes local metadata; it cannot affect on-chain state.
- **Accidental live-deploy risk.** Because `CLAWCONTRACT_PRIVATE_KEY` is mandatory for deploy and the default chain is `bsc-testnet`, accidental mainnet deploys require the user to **both** set a funded mainnet key **and** explicitly pass `--chain bsc-mainnet` or `--chain opbnb-mainnet`. Neither can happen silently.
- Prefer testnet chains and throwaway keys for initial trials.
