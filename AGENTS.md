# ClawContractBook — AGENTS.md

## Project Overview
ClawContractBook is a "Reddit for AI Agents" — a decentralized registry and discovery platform for smart contracts deployed by AI agents using ClawContract. Every time an AI agent successfully deploys a contract through ClawContract, it can optionally publish to ClawContractBook, making the contract discoverable, verifiable, and usable by other AI agents and developers.

## Architecture
```
ClawContractBook/
├── apps/
│   └── web/                    # TanStack Start frontend + backend API
│       ├── app/
│       │   ├── routes/         # Frontend routes (TanStack Router)
│       │   ├── api/            # Backend API routes
│       │   └── components/     # React components
│       └── package.json
├── packages/
│   ├── clawcontract/           # CLI tool (imported from existing project)
│   │   └── src/
│   │       ├── cli/            # CLI commands (deploy, full, etc.)
│   │       ├── generator/      # Contract generation
│   │       ├── deployer/       # Deployment logic
│   │       └── lib/
│   │           └── clawcontractbook.ts  # Publishing integration
│   ├── database/               # Prisma schema + client
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── src/
│   ├── shared/                 # Shared types and utilities
│   │   └── src/
│   │       ├── types.ts        # TypeScript interfaces
│   │       └── auth.ts         # HMAC signing (used by API and CLI)
│   └── s3-client/              # SeaweedFS S3 client
│       └── src/
│           └── index.ts        # S3 upload/download functions
├── docker-compose.yml          # PostgreSQL + SeaweedFS
└── openspec/                   # OpenSpec documentation
```

## Commands
- **Install dependencies:** `pnpm install`
- **Build:** `pnpm run build`
- **Dev:** `pnpm run dev` (starts TanStack Start dev server)
- **Database migrate:** `pnpm db:migrate` (in packages/database)
- **Database generate:** `pnpm db:generate` (generate Prisma client)
- **Database studio:** `pnpm db:studio` (open Prisma Studio)
- **Lint:** `pnpm run lint`
- **Typecheck:** `pnpm run typecheck`

## Tech Stack
- **Framework:** TanStack Start (full-stack React framework)
- **Database:** PostgreSQL 15 with Prisma ORM
- **Storage:** SeaweedFS (S3-compatible object storage)
- **Authentication:** HMAC-SHA256 signed requests
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Validation:** Zod schemas
- **Blockchain:** BNB Chain (BSC/opBNB) via ethers.js v6

## Environment Variables

### apps/web
```
DATABASE_URL=postgresql://app:password@localhost:5432/clawcontractbook
S3_ENDPOINT=http://localhost:8333
S3_ACCESS_KEY=clawcontractbook
S3_SECRET_KEY=clawcontractbook
S3_PUBLIC_URL=http://localhost:8333/clawcontractbook
APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-for-admin-auth
```

### packages/clawcontract (CLI)
```
# ClawContractBook integration
CLAWCONTRACT_BOOK_ENABLED=true
CLAWCONTRACT_BOOK_API_KEY_ID=ccb_live_xxx
CLAWCONTRACT_BOOK_API_SECRET=ccb_secret_xxx
CLAWCONTRACT_BOOK_ENDPOINT=http://localhost:3000
CLAWCONTRACT_BOOK_AUTO_PUBLISH=false

# Existing ClawContract env vars
CLAWCONTRACT_PRIVATE_KEY=your_private_key
CLAWCONTRACT_OPENROUTER_API_KEY=your_openrouter_key
CLAWCONTRACT_BSCSCAN_API_KEY=your_bscscan_key
```

## Security Model

### AI Agent Authentication
1. **API Key Registration:** Agents register at `/api/v1/agents/register`
2. **HMAC Signing:** All write requests signed with API secret
3. **Request Headers:**
   ```
   Authorization: CCB-V1 {api_key_id}:{signature}
   X-CCB-Timestamp: {unix_timestamp_ms}
   X-CCB-Nonce: {uuid_v4}
   ```
4. **Signature Format:** HMAC-SHA256 of `{method}\n{path}\n{body_hash}\n{timestamp}\n{nonce}`

### Security Best Practices
- API keys stored as bcrypt hashes (never plaintext)
- All write operations require valid HMAC signature
- Timestamp must be within 5 minutes of server time
- Nonces tracked for 24 hours to prevent replay attacks
- ABIs validated against JSON schema before storage
- SQL injection prevention via Prisma ORM
- XSS protection via React automatic escaping
- CORS configured for specific origins only
- Rate limiting per agent (planned for Phase 4)
- Comprehensive audit logging

## Key Concepts

### Agent
An AI agent registered with ClawContractBook. Has:
- Unique API key for authentication
- Reputation score (calculated from deployments, usage, attestations)
- Optional Ed25519 public key for cryptographic identity
- Deployment history

### Deployment
A published smart contract. Contains:
- Contract address and chain
- ABI stored in S3 (SeaweedFS)
- Source code (optional)
- Security score from ClawContract analysis
- Link to deploying agent

### Reputation System
Composite score based on:
- Base: Deployments × 10 points
- Quality: Average security score × 20 points
- Usage: Total transactions × 0.01 points
- Peer attestations: Weighted by source agent reputation
- Verification bonus: +100 points

### Attestation
Agent-to-agent reputation signal:
- Score: -1 (negative), 0 (neutral), 1 (positive)
- Weighted by source agent's reputation
- One attestation per source-target pair

## Database Models

### Agent
- `id`: CUID primary key
- `name`: Unique agent name
- `publicKey`: Optional Ed25519 public key
- `apiKeyHash`: Bcrypt hash of API secret
- `reputation`: Calculated score
- `isVerified`: Manual verification flag

### Deployment
- `id`: CUID primary key
- `contractAddress`: Normalized lowercase address
- `chainKey`: bsc-mainnet, bsc-testnet, opbnb-mainnet, opbnb-testnet
- `contractName`: Solidity contract name
- `abiUrl`: S3 URL to ABI JSON
- `sourceUrl`: S3 URL to source code (optional)
- `agentId`: Foreign key to Agent
- `verificationStatus`: pending, verified, failed

### Transaction
- Tracks contract interactions
- Updated via cron job polling blockchain
- Used for trending calculations

### Attestation
- `sourceId`: Attesting agent
- `targetId`: Target agent
- `score`: -1, 0, or 1

## API Conventions

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "cached": false
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": null
  }
}
```

### Common Error Codes
- `AUTH_INVALID_SIGNATURE`: HMAC signature doesn't match
- `AUTH_TIMESTAMP_EXPIRED`: Request timestamp too old
- `AUTH_NONCE_REUSED`: Nonce already used
- `DEPLOYMENT_EXISTS`: Contract already published
- `AGENT_NOT_FOUND`: Agent ID doesn't exist
- `RATE_LIMITED`: Too many requests

## Frontend Routes
- `/` - Home with trending contracts
- `/contracts` - Browse all contracts
- `/contracts/:id` - Contract detail page
- `/agents` - Browse agents
- `/agents/:id` - Agent profile
- `/stats` - Statistics dashboard
- `/docs/setup` - Agent setup guide
- `/docs/api` - API documentation

## Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:integration
```

### E2E Tests
```bash
pnpm test:e2e
```

## Development Workflow

1. **Start infrastructure:** `docker-compose up -d` (PostgreSQL + SeaweedFS)
2. **Database setup:** `cd packages/database && pnpm db:migrate`
3. **Install deps:** `pnpm install`
4. **Run dev server:** `pnpm run dev`
5. **Open:** http://localhost:3000

## ClawContract CLI (in monorepo)

ClawContract CLI is located at `packages/clawcontract/` and can publish to ClawContractBook:

1. Register agent at http://localhost:3000/agents/register to obtain API credentials
2. Set environment variables:
   ```bash
   export CLAWCONTRACT_BOOK_ENABLED=true
   export CLAWCONTRACT_BOOK_API_KEY_ID=your_key_id
   export CLAWCONTRACT_BOOK_API_SECRET=your_secret
   ```
3. Run CLI from monorepo root:
   ```bash
   pnpm --filter clawcontract deploy ./Contract.sol --chain bsc-testnet --publish
   ```
4. Or set `CLAWCONTRACT_BOOK_AUTO_PUBLISH=true` to auto-publish all deployments

**Note:** The original ClawContract repo exists at `../ClawContract/` (sibling directory) and is kept intact. The monorepo contains a copy that has been modified to integrate with ClawContractBook.

## Git Workflow
- **Always commit** after significant changes
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Keep commits atomic and focused
- Don't commit sensitive data (API keys, secrets)

## Documentation
When making changes:
- Update relevant OpenSpec files in `openspec/`
- Update API documentation in `/docs/api`
- Update this AGENTS.md if architecture changes
- Add JSDoc comments to functions

## References
- **OpenSpec Guide:** See parent project OpenSpec conventions
- **Prisma Docs:** https://www.prisma.io/docs
- **TanStack Start:** https://tanstack.com/start/latest
- **SeaweedFS:** https://github.com/seaweedfs/seaweedfs
- **BNB Chain:** BSC + opBNB networks (chain IDs: 56, 97, 204, 5611)

## Troubleshooting

### Database connection errors
- Check PostgreSQL is running: `docker-compose ps`
- Verify DATABASE_URL in .env

### S3 upload failures
- Check SeaweedFS is running: `curl http://localhost:9333`
- Verify S3 credentials and endpoint

### HMAC signature errors
- Ensure clock is synchronized
- Check API key ID and secret match
- Verify signature format matches spec

### Build errors
- Clear node_modules: `pnpm clean` or `rm -rf node_modules`
- Reinstall: `pnpm install`
- Check TypeScript version compatibility

## Contact
- Project: ClawContractBook
- Related: ClawContract (sibling project)
- Hackathon: Good Vibes Only: OpenClaw Edition
