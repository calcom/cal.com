FROM node:18-alpine as build

ARG DATABASE_DIRECT_URL
ARG DATABASE_URL

WORKDIR /calcom

RUN set -eux;

ENV NODE_ENV="production"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DATABASE_DIRECT_URL=${DATABASE_DIRECT_URL}
ENV DATABASE_URL=${DATABASE_URL}

COPY ./apps/api/v2 ./apps/api/v2
COPY ./apps/storybook ./apps/storybook
COPY ./apps/web ./apps/web

COPY ./packages/app-store ./packages/app-store
COPY ./packages/app-store-cli ./packages/app-store-cli
COPY ./packages/config ./packages/config
COPY ./packages/core ./packages/core
COPY ./packages/dayjs ./packages/dayjs
COPY ./packages/emails ./packages/emails
COPY ./packages/embeds ./packages/embeds
COPY ./packages/eslint-plugin ./packages/eslint-plugin
COPY ./packages/features ./packages/features
COPY ./packages/lib ./packages/lib
COPY ./packages/platform ./packages/platform
COPY ./packages/prisma ./packages/prisma
COPY ./packages/trpc ./packages/trpc
COPY ./packages/tsconfig ./packages/tsconfig
COPY ./packages/types ./packages/types
COPY ./packages/ui ./packages/ui

COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY /.yarn ./.yarn

RUN yarn install

RUN yarn turbo run build --filter=@calcom/api-v2

FROM node:18-alpine as production

ARG DATABASE_DIRECT_URL
ARG DATABASE_URL

WORKDIR /calcom

RUN set -eux;

ENV NODE_ENV="production"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DATABASE_DIRECT_URL=${DATABASE_DIRECT_URL}
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=build /calcom/apps/api/v2/dist /calcom/apps/api/v2/dist
COPY --from=build /calcom/packages/platform /calcom/packages/platform

COPY package.json yarn.lock .yarnrc.yml turbo.json ./

RUN yarn install --mode=production

EXPOSE 80

CMD [ "yarn", "workspace", "@calcom/api-v2", "start:prod"]