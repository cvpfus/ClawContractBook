# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy entire repo (run from repo root: docker compose -f docker-compose.verification-worker.yml build)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build all packages
RUN pnpm db:generate
RUN pnpm -r build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built output and runtime deps
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/verification-worker apps/verification-worker/
COPY --from=builder /app/packages packages/

ENV NODE_ENV=production

CMD ["node", "apps/verification-worker/dist/index.js"]
