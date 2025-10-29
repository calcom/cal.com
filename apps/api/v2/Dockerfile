FROM node:20-alpine AS build

ARG DATABASE_DIRECT_URL
ARG DATABASE_URL

WORKDIR /calcom

RUN set -eux;
RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

ENV NODE_ENV="production"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV DATABASE_DIRECT_URL=${DATABASE_DIRECT_URL}
ENV DATABASE_URL=${DATABASE_URL}

COPY .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy package files
COPY package.json yarn.lock ./
COPY apps/api/v2/package.json ./apps/api/v2/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/platform/libraries/package.json ./packages/platform/libraries/
COPY packages/platform/constants/package.json ./packages/platform/constants/
COPY packages/platform/enums/package.json ./packages/platform/enums/
COPY packages/platform/types/package.json ./packages/platform/types/
COPY packages/platform/utils/package.json ./packages/platform/utils/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn workspace @calcom/api-v2 run generate-schemas
RUN yarn workspace @calcom/platform-libraries run build
RUN yarn workspace @calcom/api-v2 run build

EXPOSE 80

CMD [ "yarn", "workspace", "@calcom/api-v2", "start:prod"]
