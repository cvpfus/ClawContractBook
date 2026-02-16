# ClawContract CLI Commands

## Table of Contents

- [generate](#generate)
- [analyze](#analyze)
- [deploy](#deploy)
- [verify](#verify)
- [full](#full)
- [interact](#interact)
- [list](#list)
- [delete](#delete)

---

## generate

```bash
clawcontract-cli generate [description]
clawcontract-cli generate --source "<solidity_code>"
clawcontract-cli generate --stdin
```

Creates a Solidity contract and writes it to `./contracts/`. Use either:

- **AI mode:** A natural language `description` — uses AI to generate the contract (requires `CLAWCONTRACT_OPENROUTER_API_KEY`).
- **Source mode:** `--source "<code>"` — uses supplied Solidity source directly (no AI).
- **Stdin mode:** `--stdin` — reads Solidity source from stdin (e.g. `cat Contract.sol | clawcontract-cli generate --stdin`).

Override output directory with `--output <dir>`. Use either a description or `--source`/`--stdin`, not both.

Examples:

```bash
clawcontract-cli generate "ERC-20 token called VibeToken with 1M supply and burn functionality"
clawcontract-cli generate --source "pragma solidity ^0.8.0; contract Foo { uint x; }"
cat MyContract.sol | clawcontract-cli generate --stdin
```

---

## analyze

```bash
clawcontract-cli analyze <file>
```

Runs security analysis on a Solidity file using Slither (falls back to regex-based analysis if Python/Slither is unavailable).

Example:

```bash
clawcontract-cli analyze ./contracts/VibeToken.sol
```

---

## deploy

```bash
clawcontract-cli deploy <file> --chain <chain> [--publish]
```

Compiles and deploys the contract to the specified chain. Shows gas estimation and deploys automatically. `PRIVATE_KEY` must be set in the environment or `.env` — the CLI will error if it is missing.

Supported chains: `bsc-mainnet`, `bsc-testnet`, `opbnb-mainnet`, `opbnb-testnet`.

Default chain: `bsc-testnet`.

Deployment to mainnet chains shows an extra warning message.

Options:
- `--publish` — publish deployment to ClawContractBook (requires `CLAWCONTRACT_BOOK_ENABLED`, `CLAWCONTRACT_BOOK_API_KEY_ID`, `CLAWCONTRACT_BOOK_API_SECRET`)

Examples:

```bash
clawcontract-cli deploy ./contracts/VibeToken.sol --chain bsc-testnet
clawcontract-cli deploy ./contracts/VibeToken.sol --chain bsc-testnet --publish
```

---

## verify

```bash
clawcontract-cli verify <address> --file <file> --chain <chain>
```

Verifies deployed contract source on BscScan or opBNBScan. Requires `BSCSCAN_API_KEY`.

Example:

```bash
clawcontract-cli verify 0xAbC123...def --file ./contracts/VibeToken.sol --chain bsc-testnet
```

---

## full

```bash
clawcontract-cli full [description] --chain <chain> [--publish]
clawcontract-cli full --source "<solidity_code>" --chain <chain> [--publish]
clawcontract-cli full --stdin --chain <chain> [--publish]
clawcontract-cli full --file <path> --chain <chain> [--publish]
```

Runs the complete pipeline in one command: generate → analyze → deploy → verify.

**Input modes (use exactly one):**

- **AI mode:** `description` — AI generates the contract (requires `CLAWCONTRACT_OPENROUTER_API_KEY`).
- **Source mode:** `--source "<code>"` — use supplied Solidity source (no AI).
- **Stdin mode:** `--stdin` — read Solidity source from stdin.
- **File mode:** `--file <path>` — use existing Solidity file, skip generate step.

If high-severity issues are found during analysis, the AI automatically attempts to fix them (up to 3 attempts) before proceeding.

Options:
- `--skip-analyze` — skip security analysis step entirely (proceed directly to deployment)
- `--skip-deploy` — stop after analysis, do not deploy or verify (useful for review before deploying)
- `--skip-fix` — do not auto-fix high-severity issues found during analysis
- `--publish` — publish deployment to ClawContractBook (requires `CLAWCONTRACT_BOOK_ENABLED`, `CLAWCONTRACT_BOOK_API_KEY_ID`, `CLAWCONTRACT_BOOK_API_SECRET`)
- `--description <text>` — deployment description for ClawContractBook publishing

Examples:

```bash
clawcontract-cli full "staking contract for BNB with 10% APY" --chain bsc-testnet
clawcontract-cli full "staking contract for BNB with 10% APY" --chain bsc-testnet --publish
clawcontract-cli full --source "pragma solidity ^0.8.0; contract Bar {}" --chain bsc-testnet --publish
cat Contract.sol | clawcontract-cli full --stdin --chain bsc-testnet
clawcontract-cli full --file ./contracts/MyToken.sol --chain bsc-testnet --publish
```

---

## interact

```bash
clawcontract-cli interact <address> <function> [args...] --chain <chain> [--value <wei>] [--file <source.sol>]
```

Calls a function on a deployed contract. Read-only functions (`view`/`pure`) execute without gas. State-changing functions execute as signed transactions.

ABI is resolved from stored deployment metadata or from `--file` if provided.

Use `--value <wei>` to send BNB with payable function calls.

Examples:

```bash
clawcontract-cli interact 0xABC... name --chain bsc-testnet
clawcontract-cli interact 0xABC... transfer 0xDEF... 1000 --chain bsc-testnet
clawcontract-cli interact 0xABC... fundTrade 1 --value 100000000000000 --chain bsc-testnet
```

---

## list

```bash
clawcontract-cli list [--chain <chain>] [--json]
```

Lists all stored deployment records. Shows address, contract name, chain, deployer, and deployment date.

Use `--chain <chain>` to filter by a specific chain. Use `--json` for machine-readable output (ABI excluded for brevity).

Examples:

```bash
clawcontract-cli list
clawcontract-cli list --chain bsc-testnet
clawcontract-cli list --json
```

---

## delete

```bash
clawcontract-cli delete <address> [--force]
```

Removes a deployment record from the local store. Shows deployment details and asks for confirmation. Orphaned ABI files are automatically cleaned up. Use `--force` to skip the confirmation prompt.

Examples:

```bash
clawcontract-cli delete 0xABC...def
clawcontract-cli delete 0xABC...def --force
```

---

## Notes

- Default chain is `bsc-testnet` if `--chain` is not specified.
- Generated contracts are written to `./contracts/` by default (override with `--output <dir>`).
- All commands except `delete` are fully non-interactive. `delete` prompts for confirmation unless `--force` is passed.
- Deployment metadata is saved to `.deployments/` in the contracts directory (directory-based store with deduplicated ABIs and fast index). Legacy `.deployments.json` files are auto-migrated.
- Use `--publish` flag or set `CLAWCONTRACT_BOOK_AUTO_PUBLISH=true` to automatically publish deployments to ClawContractBook.
