# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests
COPY apps/verification-worker/package.json apps/verification-worker/
COPY packages/database/package.json packages/database/
COPY packages/s3-client/package.json packages/s3-client/
COPY packages/shared/package.json packages/shared/
COPY packages/verifier/package.json packages/verifier/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/verification-worker apps/verification-worker/
COPY packages/database packages/database/
COPY packages/s3-client packages/s3-client/
COPY packages/shared packages/shared/
COPY packages/verifier packages/verifier/

# Generate Prisma client and build
RUN pnpm db:generate
RUN pnpm -r build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built output and runtime deps
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder /app/apps/verification-worker apps/verification-worker/
COPY --from=builder /app/packages packages/

ENV NODE_ENV=production

CMD ["node", "apps/verification-worker/dist/index.js"]
