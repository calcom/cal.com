ARG NODE_VERSION=22

# ---------------------------------------------------------
# 1️⃣ Builder stage (install + build)
# ---------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /calid

# Native deps REQUIRED for prisma/sharp/sqlite/swc
RUN set -eux; \
    apt-get update -qq && \
    apt-get install -y \
      build-essential \
      openssl \
      pkg-config \
      python-is-python3 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Yarn 3
RUN corepack enable

# Copy entire monorepo
COPY . .

# Yarn tweaks 
RUN yarn config set httpTimeout 1200000
RUN yarn config set enableImmutableInstalls false

# Install workspace deps
RUN yarn install

# Build ONLY worker and its deps
RUN yarn turbo run build --filter=@calid/worker...

# ---------------------------------------------------------
# 2️⃣ Production runtime image
# ---------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN set -eux; \
    apt-get update -qq && \
    apt-get install -y \
      openssl \
      postgresql-client \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy runtime deps
COPY --from=builder /calid/node_modules ./node_modules
COPY --from=builder /calid/package.json ./package.json

# Copy built worker
COPY --from=builder /calid/apps/worker/dist ./apps/worker/dist

# Copy shared packages needed at runtime
COPY --from=builder /calid/packages ./packages

# Copy translations
COPY --from=builder /calid/apps/web/public/static/locales ./apps/web/public/static/locales

# Generate prisma client (safe if unused)
RUN npx prisma generate || true

CMD ["node", "apps/worker/dist/index.js"]
