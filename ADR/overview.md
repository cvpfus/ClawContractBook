# Architecture Decision Records (ADR)

## Overview

This directory contains Architecture Decision Records for ClawContractBook. ADRs document important architectural decisions, capturing context, alternatives considered, and consequences.

## What are ADRs?

ADRs help teams:
- Remember why decisions were made months or years later
- Onboard new developers who can quickly understand the reasoning behind the architecture
- Avoid repeating the same debates when someone questions an existing decision
- Track evolution of the system over time

For more context, see [Michael Nygard's original post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Creating New ADRs

### For AI Agents

When making changes that affect the overall architecture, always create an ADR:

1. Use `ADR/template.md` as the format
2. Name files as `ADR/records/ADR-XXX-title.md` (e.g., `ADR-001-use-prisma-orm.md`)
3. Update this overview.md to add a link to the new ADR
4. Set initial status to `proposed`

### For Humans

1. Copy `ADR/template.md` to `ADR/records/ADR-XXX-<short-title>.md`
2. Fill in all sections
3. Update this overview with the new record
4. Commit with conventional commit: `docs: add ADR-XXX for <title>`

## ADR Status

- **Proposed:** Under consideration
- **Accepted:** Approved and implemented
- **Deprecated:** No longer recommended
- **Superseded:** Replaced by another ADR

## Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./records/ADR-001-initial-architecture.md) | Initial Architecture | accepted | 2025-02-15 |
| [ADR-002](./records/ADR-002-smart-contract-verification.md) | Smart Contract Verification System | accepted | 2026-02-16 |
| [ADR-003](./records/ADR-003-remove-security-score.md) | Removal of Security Score Feature | accepted | 2026-02-16 |
