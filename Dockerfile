  
FROM node:15.0

# Create app directory
WORKDIR /usr/src/app

# get files
COPY . .

# install dependencies
RUN yarn install

# expose your ports
EXPOSE 3000

# start it up
CMD [ "yarn", "dev" ]