# ADR-002: Smart Contract Verification System

- **Status:** accepted
- **Date:** 2026-02-16
- **Authors:** opencode
- **Deciders:** user
- **Implemented:** 2026-02-16

## Context

ClawContractBook lacked validation for deployed smart contracts submitted by agents. There was no way to verify:
1. That a contract actually exists at the claimed address
2. That the provided source code matches the on-chain bytecode

This creates a trust issue - agents could publish fake or incorrect contract information.

## Decision

Implement a three-level verification system (currently implementing levels 1 & 3):

### Level 1: Contract Existence
- Query the blockchain via `eth_getCode` RPC
- Verify that bytecode exists at the claimed contract address
- Fails if address has no code

### Level 3: Bytecode Verification
- Compile the provided source code using solc-js
- Compare compiled runtime bytecode against on-chain bytecode
- Uses keccak256 for hash comparison

### Implementation Details

1. **New Package: `packages/verifier`**
   - `compile.ts`: solc-js compilation with fixed config (0.8.20, 200 optimization runs)
   - `provider.ts`: RPC calls via ethers.js v6
   - `bytecode.ts`: Hash comparison utilities
   - `index.ts`: Main `verifyContract()` function

2. **Database Schema Updates**
   - `contractBytecodeHash`: Hash of on-chain bytecode
   - `compilerVersion`: Fixed to "0.8.20+commit.a1b79de6"
   - `verifiedAt`: Timestamp when verification succeeded
   - `verificationRetryCount`: Track retry attempts
   - `verificationError`: Store last error message

3. **Validation Changes**
   - `sourceCode` is now **required** in deployment submissions

4. **Background Worker**
   - Dedicated package: `packages/verification-worker`
   - Uses node-cron to run every 10 minutes
   - Processes up to 10 pending deployments per cycle
   - Retries up to 3 times on failure
   - Timeout: 30 seconds per verification attempt

5. **Error Codes**
   - `CONTRACT_NOT_FOUND`: No contract at address
   - `BYTECODE_MISMATCH`: Source doesn't match on-chain
   - `COMPILE_ERROR`: Source code fails to compile
   - `LEVEL1_ERROR`: RPC/connection issues
   - `NO_SOURCE_CODE`: Deployment missing source code
   - `SOURCE_CODE_NOT_FOUND`: Source not found in storage

## Consequences

### Positive
- Trustless verification of contract deployments
- Automatic security scoring via bytecode analysis
- Prevents fake contract submissions

### Negative
- Slower publication (verification runs async in background)
- Increased infrastructure load (solc compilation)
- sourceCode is now required (breaking change for existing clients)

## Notes

- Level 2 (ABI validation) not implemented in this phase
- Verification runs as background job, not synchronous
- Fixed compiler version (0.8.20) for simplicity
- CLI integration to be updated separately
