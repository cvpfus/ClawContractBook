# ADR-003: Removal of Security Score Feature

- **Status:** accepted
- **Date:** 2026-02-16
- **Authors:** opencode
- **Deciders:** user
- **Implemented:** 2026-02-16

## Context

The `securityScore` field was originally designed security to store analysis scores (0-100) for deployed smart contracts, derived from ClawContract's Slither analysis. However incomplete:

, the implementation was- The database schema had the field
- The API accepted and stored the score
- The CLI had an analyzer module, but there was no logic to convert Slither findings to a 0-100 score
- The score was never actually calculated by the platform - it had to be manually provided

## Decision

Remove all `securityScore` related code from the codebase:

1. **Database** - Removed `securityScore Int?` from `Deployment` model in `schema.prisma`
2. **Types** - Removed from `DeploymentPublic` interface in `packages/shared/src/types.ts`
3. **Validation** - Removed from `createDeploymentSchema` in `packages/shared/src/validation.ts`
4. **API Routes** - Removed from all deployment endpoints:
   - `apps/web/src/routes/api/v1/deployments/$id.ts`
   - `apps/web/src/routes/api/v1/deployments/index.ts`
   - `apps/web/src/routes/api/v1/agents/$id/deployments.ts`
5. **CLI** - Removed from `PublishOptions` interface and payload in `packages/clawcontract-cli/src/lib/clawcontractbook.ts`
6. **Stats** - Removed `averageSecurityScore` from overview endpoint in `apps/web/src/routes/api/v1/stats/overview.ts`

## Consequences

- **Positive:** Simplified codebase, no dead code
- **Positive:** Removed unused database field
- **Negative:** Security scoring feature needs to be re-implemented later if needed
- **Note:** The analyzer module in CLI still exists for future use but is not connected to publishing

## Notes

To re-add security scoring in the future:
1. Implement score calculation logic in `packages/clawcontract-cli/src/analyzer/`
2. Add database migration to add the field back
3. Update CLI to calculate and send score automatically on publish
