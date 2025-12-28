# =============================================================================
# Stage 1: Builder - Full build environment with all dependencies
# =============================================================================
FROM --platform=$BUILDPLATFORM node:20 AS builder

WORKDIR /calcom

# Build arguments for Next.js build-time configuration
ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG NEXT_PUBLIC_WEBSITE_TERMS_URL
ARG NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=secret
ARG CALENDSO_ENCRYPTION_KEY=secret
ARG MAX_OLD_SPACE_SIZE=6144
ARG NEXT_PUBLIC_API_V2_URL
ARG CSP_POLICY
ARG NEXT_PUBLIC_SINGLE_ORG_SLUG
ARG ORGANIZATIONS_ENABLED

ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
    NEXT_PUBLIC_API_V2_URL=$NEXT_PUBLIC_API_V2_URL \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
    NEXT_PUBLIC_WEBSITE_TERMS_URL=$NEXT_PUBLIC_WEBSITE_TERMS_URL \
    NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL=$NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    DATABASE_DIRECT_URL=$DATABASE_URL \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    CALENDSO_ENCRYPTION_KEY=${CALENDSO_ENCRYPTION_KEY} \
    NEXT_PUBLIC_SINGLE_ORG_SLUG=$NEXT_PUBLIC_SINGLE_ORG_SLUG \
    ORGANIZATIONS_ENABLED=$ORGANIZATIONS_ENABLED \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    BUILD_STANDALONE=true \
    CSP_POLICY=$CSP_POLICY

COPY package.json yarn.lock .yarnrc.yml playwright.config.ts turbo.json i18n.json ./
COPY .yarn ./.yarn
COPY apps/web ./apps/web
COPY apps/api/v2 ./apps/api/v2
COPY packages ./packages
COPY tests ./tests

RUN yarn config set httpTimeout 1200000
RUN npx turbo prune --scope=@calcom/web --scope=@calcom/trpc --docker
RUN yarn install
# Build trpc, embed-core, and web app
RUN yarn workspace @calcom/trpc run build
RUN yarn --cwd packages/embeds/embed-core workspace @calcom/embed-core run build
RUN yarn --cwd apps/web workspace @calcom/web run build

# Compile the seed script to JavaScript to avoid ts-node at runtime
RUN npx tsc scripts/seed-app-store.ts --outDir scripts/dist --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target ES2020 || true

# Clean up build caches
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache

# =============================================================================
# Stage 2: Builder-two - Prepare production assets with URL replacement
# =============================================================================
FROM node:20 AS builder-two

WORKDIR /calcom
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

ENV NODE_ENV=production

COPY package.json .yarnrc.yml turbo.json i18n.json ./
COPY .yarn ./.yarn
COPY --from=builder /calcom/yarn.lock ./yarn.lock
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY scripts scripts
RUN chmod +x scripts/*

ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

RUN scripts/replace-placeholder.sh http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}

# =============================================================================
# Stage 3: Deps - Install production-only dependencies on Alpine
# =============================================================================
FROM node:20-alpine AS deps

WORKDIR /calcom

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files for production install
COPY --from=builder-two /calcom/package.json ./
COPY --from=builder-two /calcom/yarn.lock ./
COPY --from=builder-two /calcom/.yarnrc.yml ./
COPY --from=builder-two /calcom/.yarn ./.yarn
COPY --from=builder-two /calcom/packages ./packages
COPY --from=builder-two /calcom/apps/web/package.json ./apps/web/package.json

# Install production dependencies only
RUN yarn workspaces focus @calcom/web --production || yarn install

# Clean up yarn cache
RUN rm -rf .yarn/cache

# =============================================================================
# Stage 4: Runner - Minimal Alpine production image
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /calcom

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    netcat-openbsd \
    wget \
    openssl

# Copy production node_modules from deps stage
COPY --from=deps /calcom/node_modules ./node_modules
COPY --from=deps /calcom/packages ./packages

# Copy Next.js standalone build output
COPY --from=builder-two /calcom/apps/web/.next/standalone ./
COPY --from=builder-two /calcom/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder-two /calcom/apps/web/public ./apps/web/public

# Copy Prisma schema and generated client for migrations
COPY --from=builder-two /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder-two /calcom/packages/prisma ./packages/prisma

# Copy scripts and other necessary files
COPY --from=builder-two /calcom/scripts ./scripts
COPY --from=builder-two /calcom/package.json ./
COPY --from=builder-two /calcom/turbo.json ./
COPY --from=builder-two /calcom/i18n.json ./

RUN chmod +x scripts/*

ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
    CMD wget --spider http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]
