# This is a fix for Exchange 2016/2019 on-premise servers
# It extends the official Cal.com Docker image to include OpenSSL legacy provider support

FROM calcom/cal.com:latest

# Set the OpenSSL legacy provider option
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Make sure the environment variable is preserved during runtime
CMD ["sh", "-c", "echo 'Using NODE_OPTIONS: $NODE_OPTIONS' && node /app/apps/web/server.js"] 