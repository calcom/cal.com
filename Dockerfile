FROM node:14-alpine as deps

RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY ./package.json ./yarn.lock ./
COPY ./prisma prisma
RUN yarn install --frozen-lockfile

FROM node:14-alpine as builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN yarn build && yarn install --production --ignore-scripts --prefer-offline

FROM node:14-alpine as runner
WORKDIR /app

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

COPY  scripts scripts
EXPOSE 3000
RUN ["chmod", "+x", "/app/scripts/start.sh"]
CMD ["/app/scripts/start.sh"]
