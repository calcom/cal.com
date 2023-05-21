# THIS FILE IS USED FOR DEVELOPMENT ONLY
# THIS IMAGE SHOULD NOT BE USED IN PRODUCTION
FROM node:18

# Create app directory
WORKDIR /usr/cal.com

COPY package*.json ./
COPY yarn.lock ./

# Copy all files from current directory to .
ADD . ./

# Create .env file
COPY .env.example ./.env

# Create NEXTAUTH_SECRET on .env
RUN echo NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\" >> ./.env

# Create CALENDSO_ENCRYPTION_KEY on .env
RUN echo CALENDSO_ENCRYPTION_KEY=\"$(openssl rand -base64 32)\" >> ./.env

# Bundle app source
COPY . ./.

# Istall dependencies on .
RUN yarn install

# Run yarn db-deploy, yarn db-migrate, and yarn db-seed, then run yarn dev
CMD ["/bin/bash", "-c", "yarn db-deploy; yarn db-seed; yarn dev"]