# Stage 1: Build
FROM node:18 AS builder

WORKDIR /calcom

ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG MAX_OLD_SPACE_SIZE=4096
ARG NEXT_PUBLIC_API_V2_URL

ENV NEXT_PUBLIC_WEBAPP_URL="http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER" \
    NEXT_PUBLIC_API_V2_URL=$NEXT_PUBLIC_API_V2_URL \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    DATABASE_DIRECT_URL=$DATABASE_URL \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    BUILD_STANDALONE=true

COPY calcom/package.json calcom/yarn.lock calcom/.yarnrc.yml calcom/playwright.config.ts calcom/turbo.json calcom/git-init.sh calcom/git-setup.sh calcom/i18n.json ./
COPY calcom/.yarn ./.yarn
COPY calcom/apps/web ./apps/web
COPY calcom/apps/api/v2 ./apps/api/v2
COPY calcom/packages ./packages

# Ensure tests directory exists
RUN mkdir -p ./tests || true
COPY calcom/tests ./tests

RUN yarn config set httpTimeout 1200000
RUN npx turbo prune --scope=@calcom/web --docker
RUN yarn install
RUN yarn db-deploy
RUN yarn --cwd packages/prisma seed-app-store
RUN yarn --cwd packages/embeds/embed-core workspace @calcom/embed-core run build
RUN yarn --cwd apps/web workspace @calcom/web run build

# Cleanup
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache

# Stage 2: Prepare Final Build
FROM node:18 AS builder-two

WORKDIR /calcom

ENV NODE_ENV production

COPY calcom/package.json calcom/.yarnrc.yml calcom/turbo.json calcom/i18n.json ./
COPY --from=builder /calcom/.yarn ./.yarn
COPY --from=builder /calcom/yarn.lock ./yarn.lock
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY scripts scripts

# Save value used during this build stage
ENV NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000"
RUN scripts/replace-placeholder.sh http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}

# Stage 3: Final Runtime
FROM node:18 AS runner

WORKDIR /calcom

COPY --from=builder-two /calcom ./

ENV NODE_ENV production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
    CMD curl --fail http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]
