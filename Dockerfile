FROM node:14.16.1-alpine3.13 as build-stage
WORKDIR /app
COPY ./ .
RUN yarn install
RUN npm run build

FROM lsiobase/alpine:3.13 as deploy-stage
WORKDIR /app
RUN \
 echo "**** install build packages ****" && \
 apk add --no-cache \
    nginx \
    npm &&\
 echo "**** Installing Yarn and Apps ****" &&\
 npm install --global yarn &&\
 yarn install &&\
 echo "**** Cleaning Up ****" &&\
 rm -rf \
	/root/.cache \
	/tmp/*
COPY root /
COPY --from=build-stage /app/.next/ /app
COPY nginx.conf /etc/nginx/