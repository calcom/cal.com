FROM node:16.13.2-alpine

RUN apk --no-cache --virtual build-dependencies add git
WORKDIR /calcom
COPY . .

ARG ENV
# RUN apt-get update
# RUN apt-get install vim

RUN yarn install
# RUN yarn build

EXPOSE 5000
ENV PORT 5000
CMD ["yarn", "start"]
