# Stage 1: Build
FROM node:18 AS builder
WORKDIR /calcom

# Define build arguments
ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG DATABASE_DIRECT_URL
ARG MAX_OLD_SPACE_SIZE=8192
ARG NEXT_PUBLIC_API_V2_URL
ARG NEXTAUTH_SECRET

# Define environment variables for build and runtime
ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
    NEXT_PUBLIC_API_V2_URL=$NEXT_PUBLIC_API_V2_URL \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    DATABASE_DIRECT_URL=$DATABASE_URL \
    NODE_OPTIONS=--max-old-space-size=8192 \
    BUILD_STANDALONE=true

# Copy necessary files
COPY package.json yarn.lock .yarnrc.yml playwright.config.ts turbo.json git-init.sh git-setup.sh i18n.json ./
COPY .yarn ./.yarn
COPY apps/web ./apps/web
COPY apps/api/v2 ./apps/api/v2
COPY packages ./packages
COPY scripts/start.sh /calcom/scripts/start.sh

# Ensure tests directory exists
RUN mkdir -p ./tests || true
COPY tests ./tests

# Install dependencies and build
RUN yarn config set httpTimeout 1200000
RUN npx turbo prune --scope=@calcom/web --docker
RUN yarn install

# ✅ Run Prisma migration before continuing
ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/calendso"
RUN yarn db-deploy
RUN yarn --cwd packages/prisma seed-app-store || true
RUN yarn --cwd packages/embeds/embed-core workspace @calcom/embed-core run build

# Cleanup
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache

# Stage 2: Prepare Final Build
FROM node:18 AS builder-two
WORKDIR /calcom

# Preserve runtime environment variables
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://postgres:postgres@postgres:5432/calendso" \
    DATABASE_DIRECT_URL="postgresql://postgres:postgres@postgres:5432/calendso"

# Copy necessary files from builder
COPY package.json .yarnrc.yml i18n.json ./
COPY turbo.json ./turbo.json
COPY --from=builder /calcom/.yarn ./.yarn
COPY --from=builder /calcom/yarn.lock ./yarn.lock
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=builder /calcom/scripts/start.sh /calcom/scripts/start.sh

RUN chmod +x /calcom/scripts/start.sh

# Save value used during this build stage
ENV NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000"

# Stage 3: Final Runtime
FROM node:18 AS runner
WORKDIR /calcom

# Copy built files from previous stage
COPY --from=builder-two /calcom ./

# ✅ Persist database connection variables for Prisma
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://postgres:postgres@postgres:5432/calendso" \
    DATABASE_DIRECT_URL="postgresql://postgres:postgres@postgres:5432/calendso"

EXPOSE 3000

COPY --from=builder-two /calcom/scripts/start.sh /calcom/scripts/start.sh
RUN chmod +x /calcom/scripts/start.sh

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
    CMD curl --fail http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]
