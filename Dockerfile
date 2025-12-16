# syntax=docker/dockerfile:1.6

FROM --platform=$BUILDPLATFORM node:20 AS pruner

WORKDIR /calcom

COPY package.json yarn.lock .yarnrc.yml playwright.config.ts turbo.json i18n.json ./
COPY .yarn ./.yarn
COPY apps/web ./apps/web
COPY apps/api/v2 ./apps/api/v2
COPY packages ./packages
COPY tests ./tests

RUN corepack enable
RUN yarn config set httpTimeout 1200000

RUN --mount=type=cache,target=/root/.cache/turbo \
    npx turbo prune --scope=@calcom/web --scope=@calcom/trpc --docker


FROM --platform=$BUILDPLATFORM node:20 AS builder

WORKDIR /calcom

## Build args
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

## Runtime env needed for build
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
    CSP_POLICY=$CSP_POLICY \
    CI=true \
    HUSKY=0 \
    TURBO_TELEMETRY_DISABLED=1 \
    YARN_ENABLE_GLOBAL_CACHE=false \
    YARN_INSTALL_STATE_PATH=.yarn/ci-cache/install-state.gz \
    YARN_NM_MODE=hardlinks-local

RUN corepack enable
RUN yarn config set httpTimeout 1200000

# --- install deps (NO scripts) ---
COPY --from=pruner /calcom/out/json/ ./
COPY --from=pruner /calcom/out/yarn.lock ./yarn.lock
COPY --from=pruner /calcom/.yarnrc.yml ./.yarnrc.yml
COPY --from=pruner /calcom/.yarn ./.yarn

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --immutable --mode=skip-build

# --- bring full pruned sources ---
COPY --from=pruner /calcom/out/full/ ./

RUN --mount=type=cache,target=/root/.cache/turbo \
    yarn workspace @calcom/trpc run build

RUN --mount=type=cache,target=/root/.cache/turbo \
    yarn --cwd packages/embeds/embed-core workspace @calcom/embed-core run build

RUN --mount=type=cache,target=/root/.cache/turbo \
    CI=true yarn --cwd apps/web workspace @calcom/web run build

RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache


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


FROM node:20 AS runner

WORKDIR /calcom

RUN apt-get update \
 && apt-get install -y --no-install-recommends netcat-openbsd wget \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder-two /calcom ./

ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
    CMD wget --spider http://localhost:3000 || exit 1

CMD ["/calcom/scripts/start.sh"]
