---
title: Upgrading
description: Keep your Cal.diy instance up to date.
---

# Upgrading

Pull the current version:

```bash
git pull
```

Check if dependencies got added/updated/removed

```bash
yarn
```

Apply database migrations by running **one of** the following commands:

In a development environment, run:

```bash
yarn workspace @calcom/prisma db-migrate
```

(this can clear your development database in some cases)

In a production environment, run:

```bash
yarn workspace @calcom/prisma db-deploy
```

Compare your `.env` file against `.env.example` to check for any new or changed environment variables:

```bash
diff .env.example .env
```

Start the server. In a development environment, just do:

```bash
yarn dev
```

For a production build, run for example:

```bash
yarn build
yarn start
```

Enjoy the new version.
