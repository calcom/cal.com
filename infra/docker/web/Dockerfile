ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim as base

WORKDIR /app

ENV NODE_ENV='production'

FROM base as build

COPY package.json yarn.lock .yarnrc.yml playwright.config.ts turbo.json git-init.sh git-setup.sh ./
COPY /.yarn ./.yarn
COPY ./packages ./packages
COPY ./apps/web ./apps/web

RUN set -eux; \
    apt-get update -qq && \
    apt-get install -y build-essential openssl pkg-config python-is-python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives && \
    yarn config set httpTimeout 1200000 && \
    npx turbo prune --scope=@calcom/web --docker && \
    yarn install && \
    yarn turbo run build --filter=@calcom/web

# Final stage
FROM base
WORKDIR /app

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app/apps/web ./apps/web

EXPOSE 3003

CMD [ "yarn", "start"]