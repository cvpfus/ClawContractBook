FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy ALL workspace package.json files (needed for lockfile resolution)
COPY apps/verification-worker/package.json apps/verification-worker/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/verifier/package.json packages/verifier/
COPY packages/s3-client/package.json packages/s3-client/
COPY packages/shared/package.json packages/shared/
COPY packages/clawcontract-cli/package.json packages/clawcontract-cli/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/database/ packages/database/
COPY packages/s3-client/ packages/s3-client/
COPY packages/verifier/ packages/verifier/
COPY apps/verification-worker/ apps/verification-worker/

# Generate Prisma client
RUN pnpm db:generate

# Build workspace packages in dependency order
RUN pnpm --filter @clawcontractbook/shared build && \
    pnpm --filter @clawcontractbook/database build && \
    pnpm --filter @clawcontractbook/s3-client build && \
    pnpm --filter @clawcontractbook/verifier build && \
    pnpm --filter @clawcontractbook/verification-worker build

CMD ["node", "apps/verification-worker/dist/index.js"]
