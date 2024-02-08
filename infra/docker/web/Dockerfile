FROM node:18-slim as base

RUN set -eux; \
    apt-get update -qq && \
    apt-get install -y build-essential openssl pkg-config python-is-python3 jq git  && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives 

#############################################
FROM base as builder

WORKDIR /app

# Disables some well-known postinstall scripts
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true \
    HUSKY=0

ENV NEXT_BUILD_ENV_OUTPUT=standalone

ENV NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000 \
    NEXTAUTH_URL=${NEXT_PUBLIC_WEBAPP_URL}/api/auth \
    NEXTAUTH_SECRET=auth_secret \
    CALENDSO_ENCRYPTION_KEY=encyrption_secret \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT_PLACEHOLDER \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED_PLACEHOLDER \
    MAX_OLD_SPACE_SIZE=4096 

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}  

COPY --link . .

# align turbo with package.json version
RUN TURBO_VERSION=$(cat package.json | jq '.dependencies["turbo"]' -r) npm i -g turbo@${TURBO_VERSION}

RUN yarn config set httpTimeout 1200000 && \ 
    turbo prune --scope=@calcom/web --docker && \
    yarn && \
    turbo run build --filter=@calcom/web...  && \
    rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache


#############################################
FROM base as unit-test

WORKDIR /app

COPY  --from=builder /app/. ./

RUN yarn run test


#############################################
FROM node:18-slim as runner

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl jq curl bash && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

WORKDIR /app

# chown to node default user/group
COPY  --from=builder --chown=node:node  /app/apps/web/next.config.js \
                    /app/apps/web/next-i18next.config.js \
                    /app/apps/web/package.json \
                    ./

# automatically leverage outputfiletracing to reduce image size
COPY  --from=builder --chown=node:node  /app/apps/web/.next/standalone ./
COPY  --from=builder --chown=node:node  /app/apps/web/.next/static ./apps/web/.next/static
COPY  --from=builder --chown=node:node  /app/apps/web/public ./apps/web/public

# # prisma schema to be loaded at runtime with dependency
RUN PRISMA_CLIENT_VERSION=$(cat packages/prisma/package.json | jq '.dependencies["@prisma/client"]' -r) npm i -g @prisma/client@${PRISMA_CLIENT_VERSION} && \
    PRISMA_VERSION=$(cat packages/prisma/package.json | jq '.dependencies["prisma"]' -r) npm i -g prisma@${PRISMA_VERSION}

COPY  --from=builder --chown=node:node /app/packages/prisma /app/packages/prisma

# entrypoint scripts
COPY --chown=node:node infra/docker/web/scripts ./
RUN ["chmod", "+x", "./replace-placeholder.sh"] 

USER node

ENTRYPOINT ["/bin/bash", "./replace-placeholder.sh"]


# enables standalone access to api route endpoints by changing the inline "localhost"
# in server.js to "0.0.0.0"
ENV HOSTNAME=0.0.0.0
ENV PORT=${NEXTJS_PORT:-3000}
EXPOSE ${PORT}

CMD ["yarn", "workspace", "@calcom/web", "docker-start-web"]


      

