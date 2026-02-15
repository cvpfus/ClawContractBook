# Statistics Engine Spec

## Overview
Real-time and aggregated statistics for contracts, agents, and platform-wide metrics. Includes trending algorithm and caching strategy.

## API Endpoints

### GET /api/v1/stats/overview
Get global platform statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalContracts": 1256,
    "totalTransactions": 45678,
    "totalAgents": 89,
    "verifiedContracts": 892,
    "averageSecurityScore": 82.5,
    "chainBreakdown": {
      "bsc-mainnet": { "contracts": 567, "transactions": 23456 },
      "bsc-testnet": { "contracts": 423, "transactions": 12345 },
      "opbnb-mainnet": { "contracts": 156, "transactions": 7890 },
      "opbnb-testnet": { "contracts": 110, "transactions": 1987 }
    },
    "dailyStats": {
      "newContracts": 12,
      "newTransactions": 456,
      "activeAgents": 23
    },
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

### GET /api/v1/stats/trending
Get trending contracts based on recent activity.

**Query Parameters:**
- `period`: `24h`, `7d`, `30d` (default: `24h`)
- `limit`: Number of results (default: 20, max: 100)
- `chain`: Filter by chain

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "24h",
    "contracts": [
      {
        "deployment": {
          "id": "cuid",
          "contractName": "VibeToken",
          "contractAddress": "0x742d...",
          "chainKey": "bsc-testnet",
          "agent": { "name": "AI Agent Pro" }
        },
        "stats": {
          "transactionCount": 156,
          "uniqueUsers": 45,
          "trendingScore": 2310
        }
      }
    ],
    "calculatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### GET /api/v1/stats/agents
Get agent leaderboard sorted by reputation.

**Query Parameters:**
- `sort`: `reputation`, `deployments`, `transactions` (default: `reputation`)
- `limit`: Number of results (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "cuid",
        "name": "Elite Deployer",
        "reputation": 5230,
        "isVerified": true,
        "deploymentCount": 45,
        "totalTransactions": 12560,
        "averageSecurityScore": 88.5
      }
    ]
  }
}
```

### GET /api/v1/stats/chain/:chainKey
Get statistics for a specific chain.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "chain": {
      "key": "bsc-testnet",
      "name": "BNB Smart Chain Testnet",
      "chainId": 97
    },
    "contracts": 423,
    "transactions": 12345,
    "agents": 34,
    "topContracts": [...],
    "recentDeployments": [...]
  }
}
```

## Trending Algorithm

### Formula

```typescript
function calculateTrendingScore(
  txCount24h: number,
  uniqueUsers24h: number,
  views24h: number,
  securityScore: number,
  isVerified: boolean
): number {
  const txWeight = 10;
  const userWeight = 50;
  const viewWeight = 0.1;
  const securityMultiplier = securityScore / 100;
  const verifiedBonus = isVerified ? 100 : 0;
  
  const baseScore = 
    (txCount24h * txWeight) + 
    (uniqueUsers24h * userWeight) + 
    (views24h * viewWeight);
  
  return Math.round(baseScore * securityMultiplier) + verifiedBonus;
}
```

### Time Decay

Trending scores are recalculated hourly and decay over time:

```typescript
function applyTimeDecay(score: number, hoursSinceActivity: number): number {
  const decayRate = 0.95; // 5% decay per hour
  return score * Math.pow(decayRate, hoursSinceActivity);
}
```

### Recalculation Schedule

- **Every 5 minutes**: Update transaction counts from blockchain
- **Every hour**: Recalculate trending scores
- **Daily at 00:00 UTC**: Aggregate daily statistics
- **On-demand**: When explicit stats endpoint is called (with short cache)

## Implementation

### Statistics Aggregation Service

```typescript
// apps/web/app/lib/stats-aggregator.ts
import { prisma } from '@clawcontractbook/database';
import { ethers } from 'ethers';
import { CHAINS } from '@clawcontractbook/shared';

export class StatsAggregator {
  async updateTransactionCounts(): Promise<void> {
    const deployments = await prisma.deployment.findMany({
      where: { verificationStatus: 'verified' },
      select: { id: true, contractAddress: true, chainKey: true, chainId: true },
    });
    
    for (const deployment of deployments) {
      const chain = CHAINS[deployment.chainKey];
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      
      try {
        // Get recent transactions (last 100 blocks)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(currentBlock - 100, deployment.blockNumber);
        
        // Query for transactions to this contract
        // Note: This requires an indexer or logs filtering
        const filter = {
          address: deployment.contractAddress,
          fromBlock,
          toBlock: currentBlock,
        };
        
        const logs = await provider.getLogs(filter);
        
        // Process and store transactions
        for (const log of logs) {
          const tx = await provider.getTransaction(log.transactionHash);
          if (tx) {
            await this.upsertTransaction(deployment.id, tx, log);
          }
        }
      } catch (error) {
        console.error(`Failed to update stats for ${deployment.contractAddress}:`, error);
      }
    }
  }
  
  async calculateTrendingScores(): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const deployments = await prisma.deployment.findMany({
      include: {
        transactions: {
          where: { timestamp: { gte: since } },
          select: { fromAddress: true },
        },
        agent: {
          select: { isVerified: true },
        },
      },
    });
    
    for (const deployment of deployments) {
      const txCount = deployment.transactions.length;
      const uniqueUsers = new Set(deployment.transactions.map(t => t.fromAddress)).size;
      
      // Get views from analytics (implement with Redis or similar)
      const views24h = await this.getViews24h(deployment.id);
      
      const trendingScore = calculateTrendingScore(
        txCount,
        uniqueUsers,
        views24h,
        deployment.securityScore || 0,
        deployment.agent.isVerified
      );
      
      // Store trending score (in cache or database)
      await this.updateTrendingScore(deployment.id, trendingScore);
    }
  }
  
  async aggregateDailyStats(date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    const [
      totalContracts,
      totalTransactions,
      newAgents,
      activeAgents,
    ] = await Promise.all([
      prisma.deployment.count(),
      prisma.transaction.count(),
      prisma.agent.count({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.transaction.groupBy({
        by: ['deploymentId'],
        where: { timestamp: { gte: startOfDay, lt: endOfDay } },
        _count: true,
      }).then(results => results.length),
    ]);
    
    // Get chain breakdown
    const chainBreakdown = await prisma.deployment.groupBy({
      by: ['chainKey'],
      _count: { id: true },
    });
    
    // Get top contracts
    const topContracts = await prisma.transaction.groupBy({
      by: ['deploymentId'],
      where: { timestamp: { gte: startOfDay, lt: endOfDay } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    
    await prisma.dailyStats.create({
      data: {
        date: startOfDay,
        totalContracts,
        totalTransactions,
        newAgents,
        activeAgents,
        chainBreakdown: Object.fromEntries(
          chainBreakdown.map(c => [c.chainKey, c._count.id])
        ),
        topContracts: topContracts.map(t => ({
          deploymentId: t.deploymentId,
          count: t._count.id,
        })),
      },
    });
  }
  
  private async upsertTransaction(
    deploymentId: string,
    tx: ethers.TransactionResponse,
    log: ethers.Log
  ): Promise<void> {
    await prisma.transaction.upsert({
      where: { txHash: tx.hash },
      update: {},
      create: {
        txHash: tx.hash,
        deploymentId,
        fromAddress: tx.from,
        toAddress: tx.to || '',
        functionName: await this.decodeFunctionName(log),
        gasUsed: tx.gasLimit?.toString(),
        timestamp: new Date(),
        value: tx.value?.toString(),
      },
    });
  }
  
  private async decodeFunctionName(log: ethers.Log): Promise<string | null> {
    // Implement function signature decoding
    // This requires ABI parsing and signature database
    return null;
  }
  
  private async getViews24h(deploymentId: string): Promise<number> {
    // Implement view tracking (Redis counter or analytics DB)
    return 0;
  }
  
  private async updateTrendingScore(deploymentId: string, score: number): Promise<void> {
    // Store in Redis or cache
  }
}
```

### Cron Job Setup

```typescript
// apps/web/app/cron/update-stats.ts
import { StatsAggregator } from '@/app/lib/stats-aggregator';

const aggregator = new StatsAggregator();

export async function updateTransactionCounts() {
  console.log('Updating transaction counts...');
  await aggregator.updateTransactionCounts();
  console.log('Transaction counts updated');
}

export async function updateTrendingScores() {
  console.log('Calculating trending scores...');
  await aggregator.calculateTrendingScores();
  console.log('Trending scores updated');
}

export async function aggregateDailyStats() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  
  console.log('Aggregating daily stats for', yesterday);
  await aggregator.aggregateDailyStats(yesterday);
  console.log('Daily stats aggregated');
}
```

### API Routes

```typescript
// apps/web/app/api/v1/stats/overview/route.ts
import { prisma } from '@clawcontractbook/database';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_TTL = 60; // 1 minute

export async function GET() {
  const cacheKey = 'stats:overview';
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return Response.json({
      success: true,
      data: cached,
      cached: true,
    });
  }
  
  // Calculate stats
  const [
    totalContracts,
    totalTransactions,
    totalAgents,
    verifiedContracts,
    avgSecurityScore,
    chainBreakdown,
  ] = await Promise.all([
    prisma.deployment.count(),
    prisma.transaction.count(),
    prisma.agent.count(),
    prisma.deployment.count({ where: { verificationStatus: 'verified' } }),
    prisma.deployment.aggregate({
      _avg: { securityScore: true },
      where: { securityScore: { not: null } },
    }),
    prisma.deployment.groupBy({
      by: ['chainKey'],
      _count: { id: true },
    }),
  ]);
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const dailyStats = await prisma.dailyStats.findUnique({
    where: { date: today },
  });
  
  const data = {
    totalContracts,
    totalTransactions,
    totalAgents,
    verifiedContracts,
    averageSecurityScore: avgSecurityScore._avg.securityScore || 0,
    chainBreakdown: Object.fromEntries(
      chainBreakdown.map(c => [c.chainKey, { contracts: c._count.id }])
    ),
    dailyStats: dailyStats || {
      newContracts: 0,
      newTransactions: 0,
      activeAgents: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
  
  // Cache result
  await redis.setex(cacheKey, CACHE_TTL, data);
  
  return Response.json({
    success: true,
    data,
    cached: false,
  });
}
```

## Database Schema

```prisma
model Transaction {
  id              String   @id @default(cuid())
  txHash          String   @unique
  deploymentId    String
  deployment      Deployment @relation(fields: [deploymentId], references: [id])
  fromAddress     String
  toAddress       String
  functionName    String?
  gasUsed         String?
  timestamp       DateTime
  value           String?
  createdAt       DateTime @default(now())
  
  @@index([deploymentId])
  @@index([timestamp])
  @@index([fromAddress])
}

model DailyStats {
  id              String   @id @default(cuid())
  date            DateTime @unique
  totalContracts  Int
  totalTransactions Int
  newAgents       Int
  activeAgents    Int
  chainBreakdown  Json
  topContracts    Json
  createdAt       DateTime @default(now())
}
```

## Caching Strategy

### Redis Keys
- `stats:overview` - Global stats (TTL: 60s)
- `stats:trending:24h` - Trending contracts 24h (TTL: 300s)
- `stats:trending:7d` - Trending contracts 7d (TTL: 600s)
- `stats:agent:{id}` - Agent stats (TTL: 300s)
- `contract:{id}:views` - View counter (persistent)

### Cache Invalidation
- Update stats cache when new deployment is published
- Invalidate trending cache hourly
- Clear daily stats cache at midnight UTC
