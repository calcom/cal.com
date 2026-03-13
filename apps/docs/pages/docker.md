---
title: Docker
description: Deploy Cal.diy with Docker and docker compose.
---

# Docker

### Introduction

This image can be found on DockerHub at [https://hub.docker.com/r/calcom/cal.diy](https://hub.docker.com/r/calcom/cal.diy). Note for ARM Users: Use the `-arm` suffix for pulling images. Example: `docker pull calcom/cal.diy:v5.6.19-arm`.

### Contributing

The Docker configuration for Cal.diy is officially maintained in the main Cal.diy repository. The Dockerfile and docker-compose.yml are located in the root of the calcom/cal.diy repository. If you want to contribute to the Docker setup, please open an issue or pull request in the main Cal.diy repository.

### Requirements

Make sure you have `docker` & `docker compose` installed on the server / system. Note: `docker compose` without the hyphen is now the primary method of using docker-compose, per the Docker documentation.

### Getting Started

Clone the Cal.diy repository

```bash
git clone https://github.com/calcom/cal.diy.git
```

Change into the directory

```bash
cd cal.diy
```

Prepare your configuration: Rename .env.example to .env and then update .env

```bash
cp .env.example .env
```

(optional) Pre-Pull the images by running the following command

```bash
docker compose pull
```

Start Cal.diy via docker compose (Most basic users, and for First Run) To run the complete stack, which includes a local Postgres database, Cal.diy web app, and Prisma Studio:

```bash
docker compose up -d
```

To run Cal.diy web app and Prisma Studio against a remote database, ensure that DATABASE_URL is configured for an available database and run:

```bash
docker compose up -d calcom studio
```

To run only the Cal.diy web app, ensure that DATABASE_URL is configured for an available database and run:

```bash
docker compose up -d calcom
```

1. Most configurations can be left as-is, but for configuration options see Important Run-time variables below. Update the appropriate values in your .env file, then proceed.
2. Open a browser to http://localhost:3000, or your defined NEXT_PUBLIC_WEBAPP_URL. The first time you run Cal.diy, a setup wizard will initialize. Define your first user, and you're ready to go!

### Update Calcom Instance

Stop the Cal.diy stack

```bash
docker compose down
```

Pull the latest changes

```bash
docker compose pull
```

Re-start the Cal.diy stack

```bash
docker compose up -d
```

1. Update environment variables as necessary.

### Configuration

#### Build-time variables

These variables must be provided at the time of the docker build, and can be provided by updating the .env file. Changing these is not required for evaluation, but may be required for running in production. Currently, if you require changes to these variables, you must follow the instructions to build and publish your own image.

- `NEXT_PUBLIC_TELEMETRY_KEY`
- `NEXT_PUBLIC_LICENSE_CONSENT`
- `NEXT_PUBLIC_WEBAPP_URL`

#### Important Run-time variables

- `NEXTAUTH_SECRET`

## Advanced Users - Building and Configuring

For more detailed instructions on how to build and configure your own Docker image, refer to the Dockerfile and docker-compose.yml in the root of the Cal.diy repository.

## Troubleshooting

- **Failed to commit changes: Invalid 'prisma.user.create()'**: Certain versions may have trouble creating a user if the field `metadata` is empty. Using an empty json object `{}` as the field value should resolve this issue. Also, the `id` field will autoincrement, so you may also try leaving the value of `id` as empty.
- **SSL edge termination**: If running behind a load balancer which handles SSL certificates, you should configure proper certificates for the backend connection. If you use internal CAs, set `NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt` so Node.js trusts your internal certificates. Avoid disabling TLS verification entirely as it exposes the application to man-in-the-middle attacks.

### CLIENT_FETCH_ERROR

If you experience this error, it may be the way the default Auth callback in the server is using the WEBAPP_URL as a base url. The container does not necessarily have access to the same DNS as your local machine, and therefore needs to be configured to resolve to itself. You may be able to correct this by configuring `NEXTAUTH_URL=http://localhost:3000/api/auth`, to help the backend loop back to itself.

```
docker-calcom-1  | @calcom/web:start: [next-auth][error][CLIENT_FETCH_ERROR]
docker-calcom-1  | @calcom/web:start: https://next-auth.js.org/errors#client_fetch_error request to http://testing.localhost:3000/api/auth/session failed, reason: getaddrinfo ENOTFOUND testing.localhost
```
