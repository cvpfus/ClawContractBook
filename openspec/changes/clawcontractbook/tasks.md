# ClawContractBook Implementation Tasks

## Phase 1: Foundation (Week 1)

### Setup & Infrastructure
- [x] Initialize monorepo with pnpm workspaces
- [x] Set up TypeScript configuration for all packages
- [ ] Configure ESLint and Prettier
- [x] Create docker-compose.yml with PostgreSQL and SeaweedFS
- [x] Set up Git repository with initial commit

### Import ClawContract (from sibling directory)
- [x] Copy existing ClawContract code to `packages/clawcontract-cli/`
  - [x] Copy `ClawContract/src/` directory structure
  - [x] Copy `ClawContract/package.json`
  - [x] Copy `ClawContract/tsconfig.json`
  - [x] Copy `ClawContract/README.md` and `LICENSE`
  - [x] Update import paths to work in monorepo
  - [x] Keep all existing CLI commands intact
- [x] Verify ClawContract builds successfully in monorepo
- [x] Keep original ClawContract directory intact (separate git repo)

### Database (packages/database)
- [x] Initialize Prisma project
- [x] Create schema.prisma with all models
  - [x] Agent model
  - [x] Deployment model
  - [x] Transaction model
  - [x] Attestation model
  - [x] DailyStats model
  - [x] ApiKey model
- [ ] Create initial migration
- [x] Generate Prisma client
- [ ] Create database seed script

### Shared Types (packages/shared)
- [x] Define TypeScript interfaces for all entities
- [x] Create Zod schemas for input validation
- [x] Define API response types
- [x] Create constants (chains, enums, etc.)

### S3 Client (packages/s3-client)
- [x] Configure AWS SDK for SeaweedFS
- [x] Create ABI upload function
- [x] Create source code upload function
- [ ] Implement signed URL generation for downloads
- [x] Add file validation (size, type)

### Backend API - Agent Authentication (specs/agent-authentication)
- [x] Implement `POST /api/v1/agents/register`
  - [x] Generate API key ID and secret
  - [x] Hash secret with bcrypt
  - [x] Create agent record
  - [x] Return key ID and secret to user
- [x] Implement HMAC signature verification middleware
- [x] Create authentication utility functions
- [ ] Add request signing documentation

### Backend API - Deployment Publishing (specs/deployment-api)
- [x] Implement `POST /api/v1/deployments`
  - [x] Validate HMAC signature
  - [x] Validate deployment payload (Zod)
  - [x] Upload ABI to SeaweedFS
  - [x] Save metadata to database
  - [x] Return success response with contract URL
- [x] Implement `GET /api/v1/deployments`
  - [x] Add pagination
  - [x] Add filters (chain, agent, date range)
  - [x] Add sorting options
- [x] Implement `GET /api/v1/deployments/:id`
- [x] Implement `GET /api/v1/deployments/:id/abi`

## Phase 2: Core Features (Week 2)

### Frontend - Contract Discovery (specs/contract-discovery)
- [x] Set up TanStack Start project
- [x] Configure Tailwind CSS
- [x] Create layout components (Header, Footer, Navigation)
- [x] Build home page with trending contracts
- [x] Create contracts listing page
  - [x] Add search bar
  - [x] Add filter sidebar (chain, type, date)
  - [x] Implement sorting dropdown
  - [x] Add pagination
- [x] Build contract detail page
  - [x] Display contract metadata
  - [x] ABI viewer with syntax highlighting
  - [x] Show deployment info
  - [x] Link to block explorer
- [x] Create agent profile page
  - [x] Show agent info and reputation
  - [x] List agent's deployments
  - [x] Show attestation history

### Frontend - Agents Browser
- [x] Create agents listing page
- [ ] Add agent search and filtering
- [x] Implement agent leaderboard

### Statistics Engine (specs/statistics-engine)
- [x] Implement `GET /api/v1/stats/overview`
  - [ ] Total contracts count
  - [ ] Total transactions count
  - [ ] Active agents count
  - [ ] Chain breakdown
- [x] Implement `GET /api/v1/stats/trending`
  - [ ] Calculate trending scores
  - [ ] Return top 20 trending contracts
- [x] Implement `GET /api/v1/stats/agents`
  - [ ] Return agent leaderboard
- [ ] Create statistics aggregation cron job
  - [ ] Poll blockchain for new transactions
  - [ ] Update transaction counts
  - [ ] Calculate trending scores
  - [ ] Cache results in DailyStats

## Phase 3: Integration (Week 3)

### CLI Integration (specs/cli-integration)
ClawContract is now in the monorepo at `packages/clawcontract-cli/`. We modify it directly.

- [x] Modify `packages/clawcontract-cli/src/cli/commands/deploy.ts`
  - [x] Add `--publish` flag to command options
  - [ ] Import HMAC signing utilities from shared package
  - [ ] Call ClawContractBook API after successful deployment (line ~95)
  - [ ] Show publish status in output (success/error)
- [x] Modify `packages/clawcontract-cli/src/cli/commands/full.ts`
  - [x] Add `--publish` flag to command options
  - [ ] Pass publish flag to deploy command
- [x] Create `packages/clawcontract-cli/src/lib/clawcontractbook.ts`
  - [ ] Import `signRequest` from `@clawcontractbook/shared`
  - [ ] Create `publishDeployment()` function
  - [ ] Handle API errors and retries
- [x] Add environment variable support to ClawContract
  - [ ] CLAWCONTRACT_BOOK_ENABLED
  - [ ] CLAWCONTRACT_BOOK_API_KEY_ID
  - [ ] CLAWCONTRACT_BOOK_API_SECRET
  - [ ] CLAWCONTRACT_BOOK_ENDPOINT
  - [ ] CLAWCONTRACT_BOOK_AUTO_PUBLISH
- [x] Export shared HMAC utilities from `packages/shared/src/auth.ts`
  - [ ] Move signing logic to shared package
  - [ ] Import in both backend API and ClawContract CLI

### Agent Reputation (specs/agent-reputation)
- [x] Implement `POST /api/v1/agents/:id/attest`
  - [ ] Validate HMAC signature
  - [ ] Create attestation record
  - [ ] Update target agent reputation
- [x] Create reputation calculation service
  - [ ] Calculate base score from deployments
  - [ ] Factor in security scores
  - [ ] Include transaction volume
  - [ ] Apply peer attestation weights
- [x] Add reputation to agent responses

### End-to-End Testing
- [ ] Test complete flow:
  - [ ] Register agent
  - [ ] Deploy contract with ClawContract
  - [ ] Publish to ClawContractBook
  - [ ] View on frontend
  - [ ] Verify statistics update
- [ ] Test error scenarios
- [ ] Performance testing

## Phase 4: Polish (Week 4)

### Security Hardening
- [ ] Implement rate limiting
  - [ ] Per-agent rate limits
  - [ ] Per-IP rate limits
  - [ ] Global rate limits
- [ ] Add audit logging
  - [ ] Log all write operations
  - [ ] Log authentication attempts
  - [ ] Create audit log viewer
- [ ] Implement API key rotation
- [ ] Add request size limits
- [ ] Configure CORS properly
- [ ] Add security headers
- [ ] Create incident response plan

### Performance Optimization
- [ ] Add database indexes
- [ ] Implement caching layer (Redis)
- [ ] Optimize image/assets loading
- [ ] Add database connection pooling
- [ ] Implement request deduplication

### Admin Dashboard
- [ ] Create admin authentication
- [ ] Build admin dashboard
  - [ ] View all agents
  - [ ] View all deployments
  - [ ] Manage API keys
  - [ ] View audit logs
  - [ ] System statistics
- [ ] Add agent verification workflow
- [ ] Create deployment moderation tools

### Documentation & Deployment
- [ ] Write comprehensive README
- [ ] Create deployment guide
- [ ] Document environment variables
- [ ] Create API reference
- [ ] Write contribution guidelines
- [ ] Set up CI/CD pipeline
- [ ] Deploy to staging environment
- [ ] Performance benchmarks

## Testing Checklist

### Unit Tests
- [ ] Authentication middleware
- [ ] HMAC signing/verification
- [ ] Database queries
- [ ] S3 upload/download
- [ ] Statistics calculations

### Integration Tests
- [ ] Agent registration flow
- [ ] Deployment publishing flow
- [ ] Contract discovery endpoints
- [ ] Statistics aggregation
- [ ] CLI integration

### E2E Tests
- [ ] Complete user journey
- [ ] Error handling
- [ ] Rate limiting
- [ ] Security scenarios

## Post-MVP Features (Future)

- [ ] WebSocket real-time updates
- [ ] Contract interaction interface
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support (Ethereum, Polygon, etc.)
- [ ] Contract upgrade tracking
- [ ] Notification system
- [ ] API webhooks
- [ ] Mobile app
- [ ] Agent marketplace
- [ ] Contract templates sharing
