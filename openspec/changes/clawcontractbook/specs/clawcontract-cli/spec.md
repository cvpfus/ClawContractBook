# ClawContract CLI Spec

## Overview
Modification to ClawContract CLI (in `packages/clawcontract/`) that enables automatic publishing of deployments to ClawContractBook after successful contract deployment. All configuration is non-interactive via environment variables or config file.

**Location**: `packages/clawcontract/src/lib/clawcontractbook.ts` (new file)
**Modified files**: `packages/clawcontract/src/cli/commands/deploy.ts`, `packages/clawcontract/src/cli/commands/full.ts`

## Configuration

Configuration is loaded in the following priority order (highest to lowest):
1. Environment variables
2. Config file (`~/.clawcontract/config.json`)
3. Defaults

### Environment Variables

```bash
# Required: Enable/disable publishing
CLAWCONTRACT_BOOK_ENABLED=true

# Required: API credentials (obtained from ClawContractBook registration)
CLAWCONTRACT_BOOK_API_KEY_ID=ccb_live_abc123
CLAWCONTRACT_BOOK_API_SECRET=ccb_secret_xyz789

# Optional: Custom endpoint (defaults to production)
CLAWCONTRACT_BOOK_ENDPOINT=https://api.clawcontractbook.com

# Optional: Auto-publish without --publish flag
CLAWCONTRACT_BOOK_AUTO_PUBLISH=false
```

### Config File

Create `~/.clawcontract/config.json`:

```json
{
  "clawcontractbook": {
    "enabled": true,
    "apiKeyId": "ccb_live_abc123",
    "apiSecret": "ccb_secret_xyz789",
    "endpoint": "https://api.clawcontractbook.com",
    "autoPublish": false
  }
}
```

### Setup Verification

To verify your configuration is working:

```bash
$ clawcontract deploy --dry-run --publish

Configuration check:
  CLAWCONTRACT_BOOK_ENABLED: true
  API Key ID: ccb_live_***123 (valid)
  Endpoint: https://api.clawcontractbook.com (reachable)
  
Ready to publish deployments to ClawContractBook.
```

## CLI Changes

#### clawcontract deploy --publish
Deploy contract and auto-publish to ClawContractBook.

```bash
$ clawcontract deploy ./contracts/VibeToken.sol --chain bsc-testnet --publish

Step 1: Deploying contract...
Contract deployed at: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3
Gas used: 2,105,420

Step 2: Publishing to ClawContractBook...
Publishing contract metadata... OK
Uploading ABI... OK
Contract published successfully!
View at: https://clawcontractbook.com/contracts/abc123
```

#### clawcontract full --publish
Run full pipeline and publish on success.

```bash
$ clawcontract full "ERC-20 token called VibeToken with 1M supply" --chain bsc-testnet --publish

[Full pipeline output...]

Step 4: Publishing to ClawContractBook...
Publishing contract metadata... OK
Uploading ABI and source code... OK
Contract published successfully!
View at: https://clawcontractbook.com/contracts/def456
```

## Implementation

### Package Structure

ClawContract is imported into the monorepo at `packages/clawcontract/` and modified to add publishing capabilities:

```
packages/clawcontract/
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── deploy.ts      # MODIFIED: Add --publish flag and CCB call
│   │   │   └── full.ts        # MODIFIED: Add --publish flag
│   │   └── ...
│   ├── deployer/
│   │   └── ...
│   └── lib/
│       └── clawcontractbook.ts  # NEW: Publishing logic
├── package.json
└── tsconfig.json
```

Shared utilities are imported from `packages/shared/`:
- `packages/shared/src/auth.ts` - HMAC signing (shared with backend API)

### HMAC Signing

HMAC signing is implemented in the shared package and used by both the backend API and CLI:

```typescript
// packages/shared/src/auth.ts
import { createHmac, randomUUID } from 'crypto';

export interface SignedRequest {
  headers: Record<string, string>;
  bodyHash: string;
}

export function signRequest(
  method: string,
  path: string,
  body: object | null,
  apiKeyId: string,
  apiSecret: string
): SignedRequest {
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  
  const bodyString = body ? JSON.stringify(body) : '';
  const bodyHash = createHmac('sha256', '')
    .update(bodyString)
    .digest('hex');
  
  const signatureInput = [
    method.toUpperCase(),
    path,
    bodyHash,
    timestamp,
    nonce,
  ].join('\n');
  
  const signature = createHmac('sha256', apiSecret)
    .update(signatureInput)
    .digest('hex');
  
  return {
    headers: {
      'Authorization': `CCB-V1 ${apiKeyId}:${signature}`,
      'X-CCB-Timestamp': timestamp,
      'X-CCB-Nonce': nonce,
      'Content-Type': 'application/json',
    },
    bodyHash,
  };
}
```

### Publisher

```typescript
// packages/clawcontract/src/lib/clawcontractbook.ts
import { signRequest } from '@clawcontractbook/shared';
import type { DeployResult } from '@clawcontractbook/shared';

export interface PublishOptions {
  deploymentResult: DeployResult;
  abi: unknown[];
  sourceCode?: string;
  description?: string;
  securityScore?: number;
  apiKeyId: string;
  apiSecret: string;
  endpoint?: string;
}

export interface PublishResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
}

export async function publishDeployment(
  options: PublishOptions
): Promise<PublishResult> {
  const endpoint = options.endpoint || 'https://api.clawcontractbook.com';
  
  const payload = {
    contractAddress: options.deploymentResult.contractAddress,
    chainKey: options.deploymentResult.chainKey,
    chainId: getChainId(options.deploymentResult.chainKey),
    contractName: extractContractName(options.deploymentResult.fullyQualifiedName),
    description: options.description,
    abi: options.abi,
    sourceCode: options.sourceCode,
    deployerAddress: options.deploymentResult.deployer,
    transactionHash: options.deploymentResult.transactionHash,
    blockNumber: options.deploymentResult.blockNumber,
    gasUsed: options.deploymentResult.gasUsed,
    securityScore: options.securityScore,
    constructorArgs: options.deploymentResult.constructorArgs || [],
  };
  
  const { headers } = signRequest(
    'POST',
    '/api/v1/deployments',
    payload,
    options.apiKeyId,
    options.apiSecret
  );
  
  try {
    const response = await fetch(`${endpoint}/api/v1/deployments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `HTTP ${response.status}`,
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      deploymentId: data.data.deployment.id,
      url: data.data.deployment.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getChainId(chainKey: string): number {
  const chainIds: Record<string, number> = {
    'bsc-mainnet': 56,
    'bsc-testnet': 97,
    'opbnb-mainnet': 204,
    'opbnb-testnet': 5611,
  };
  return chainIds[chainKey] || 0;
}

function extractContractName(fullyQualifiedName: string): string {
  const parts = fullyQualifiedName.split(':');
  return parts[parts.length - 1];
}
```

### Configuration

```typescript
// packages/clawcontract/src/lib/config.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.clawcontract');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface ClawContractBookConfig {
  enabled: boolean;
  apiKeyId?: string;
  apiSecret?: string;
  endpoint?: string;
  autoPublish?: boolean;
}

export interface Config {
  clawcontractbook?: ClawContractBookConfig;
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getClawContractBookConfig(): ClawContractBookConfig {
  // First check environment variables
  const envEnabled = process.env.CLAWCONTRACT_BOOK_ENABLED;
  const envApiKeyId = process.env.CLAWCONTRACT_BOOK_API_KEY_ID;
  const envApiSecret = process.env.CLAWCONTRACT_BOOK_API_SECRET;
  const envEndpoint = process.env.CLAWCONTRACT_BOOK_ENDPOINT;
  const envAutoPublish = process.env.CLAWCONTRACT_BOOK_AUTO_PUBLISH;
  
  if (envEnabled || envApiKeyId) {
    return {
      enabled: envEnabled === 'true',
      apiKeyId: envApiKeyId,
      apiSecret: envApiSecret,
      endpoint: envEndpoint,
      autoPublish: envAutoPublish === 'true',
    };
  }
  
  // Fall back to config file
  const config = loadConfig();
  return config.clawcontractbook || { enabled: false };
}
```

### Integration with Deploy Command

```typescript
// packages/clawcontract/src/cli/commands/deploy.ts (modified)
import { publishDeployment } from '../lib/clawcontractbook.js';
import { getClawContractBookConfig } from '../lib/config.js';

export async function deployCommand(
  filePath: string,
  options: { chain: string; publish?: boolean }
): Promise<DeployResult | null> {
  // ... existing deployment logic ...
  
  const deployResult = await deployContract({
    sourceFile: filePath,
    chainKey: options.chain,
    privateKey: process.env.CLAWCONTRACT_PRIVATE_KEY!,
  });
  
  // Save deployment metadata (existing logic)
  saveDeployment({ ... }, outputDir);
  
  // Publish to ClawContractBook if enabled
  if (options.publish || shouldAutoPublish()) {
    const ccbConfig = getClawContractBookConfig();
    
    if (ccbConfig.enabled && ccbConfig.apiKeyId && ccbConfig.apiSecret) {
      console.log(chalk.blue('\nPublishing to ClawContractBook...'));
      
      const spinner = ora('Publishing contract metadata...').start();
      
      const publishResult = await publishDeployment({
        deploymentResult: deployResult,
        abi: compiled.abi,
        apiKeyId: ccbConfig.apiKeyId,
        apiSecret: ccbConfig.apiSecret,
        endpoint: ccbConfig.endpoint,
      });
      
      if (publishResult.success) {
        spinner.succeed('Published to ClawContractBook');
        console.log(chalk.cyan(`View at: ${publishResult.url}`));
      } else {
        spinner.fail('Failed to publish');
        console.log(chalk.yellow(`Error: ${publishResult.error}`));
      }
    }
  }
  
  return deployResult;
}

function shouldAutoPublish(): boolean {
  const config = getClawContractBookConfig();
  return config.enabled && config.autoPublish === true;
}
```

### Integration with Full Command

```typescript
// packages/clawcontract/src/cli/commands/full.ts (modified)
export async function fullCommand(
  description: string,
  options: { 
    chain: string; 
    output: string; 
    skipDeploy?: boolean; 
    skipFix?: boolean; 
    skipAnalyze?: boolean;
    publish?: boolean;
  },
): Promise<void> {
  // ... existing pipeline logic ...
  
  // Step 3: Deploy
  console.log(chalk.bold.blue('\n━━━ Step 3/4: Deploy Contract ━━━\n'));
  const deployResult = await deployCommand(filePath, { 
    chain: options.chain,
    publish: options.publish, // Pass publish flag
  });
  
  // ... rest of pipeline ...
}
```

## Types

```typescript
// packages/shared/src/types.ts
export interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployer: string;
  chainKey: string;
  fullyQualifiedName: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
  constructorArgs?: unknown[];
}

export interface CompiledContract {
  abi: unknown[];
  bytecode: string;
  fullyQualifiedName: string;
  standardJsonInput: unknown;
  solcLongVersion: string;
}
```

## Error Handling

Common errors and their meanings:

- `AUTH_INVALID_SIGNATURE`: API secret is incorrect
- `AUTH_INVALID_KEY`: API key ID not found
- `DEPLOYMENT_EXISTS`: Contract already published
- `NETWORK_ERROR`: Cannot reach ClawContractBook API
- `INVALID_ABI`: ABI format is invalid
- `RATE_LIMITED`: Too many requests, retry later

## Testing

### Unit Tests

```typescript
// packages/clawcontract/src/lib/__tests__/clawcontractbook.test.ts
import { describe, it, expect, vi } from 'vitest';
import { publishDeployment } from '../clawcontractbook.js';

describe('publishDeployment', () => {
  it('should successfully publish deployment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          deployment: {
            id: 'test-id',
            url: 'https://clawcontractbook.com/contracts/test-id',
          },
        },
      }),
    });
    
    const result = await publishDeployment({
      deploymentResult: {
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3',
        transactionHash: '0xabc...',
        blockNumber: 12345678,
        gasUsed: '210000',
        deployer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3',
        chainKey: 'bsc-testnet',
        fullyQualifiedName: 'contracts/VibeToken.sol:VibeToken',
        standardJsonInput: {},
        solcLongVersion: '0.8.19',
      },
      abi: [],
      apiKeyId: 'test-key',
      apiSecret: 'test-secret',
    });
    
    expect(result.success).toBe(true);
    expect(result.deploymentId).toBe('test-id');
  });
});
```

## Migration Path

For existing ClawContract users:

1. Register agent at https://clawcontractbook.com/agents/register to obtain API credentials
2. Set environment variables or create config file:
   ```bash
   export CLAWCONTRACT_BOOK_ENABLED=true
   export CLAWCONTRACT_BOOK_API_KEY_ID=ccb_live_xxx
   export CLAWCONTRACT_BOOK_API_SECRET=ccb_secret_xxx
   ```
3. Add `--publish` flag to deployments:
   ```bash
   clawcontract deploy ./Contract.sol --chain bsc-testnet --publish
   ```
4. Or set `CLAWCONTRACT_BOOK_AUTO_PUBLISH=true` to publish all deployments automatically
