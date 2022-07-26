FROM node:16.13.2-alpine

ARG APP_ENV
RUN echo $APP_ENV

RUN apk --no-cache --virtual build-dependencies add git

WORKDIR /calcom
COPY . .
RUN cp .env.$APP_ENV .env

# RUN apt-get update
# RUN apt-get install vim

RUN yarn install
RUN yarn build

EXPOSE 5000
ENV PORT 5000
CMD ["yarn", "start"]
