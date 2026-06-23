> [!WARNING]  
> Use at your own risk. Cal.diy is the open source community edition of Cal.com and it is intended for users who want to self-host their own Cal.diy instance. It is strictly recommended for personal, non-production use. Please review all installation and configuration steps carefully. Self-hosting requires advanced knowledge of server administration, database management, and securing sensitive data. Proceed only if you are comfortable with these responsibilities.

> [!TIP]
> For any commercial and enterprise-ready scheduling infrastructure, use Cal.com, not Cal.diy; hosted by us or get invited to on-prem enterprise access here: <a href="https://cal.com/sales">https://cal.com/sales</a>

<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/calcom/cal.diy">
   <img src="https://user-images.githubusercontent.com/8019099/210054112-5955e812-a76e-4160-9ddd-58f2c72f1cce.png" alt="Logo">
  </a>

  <h3 align="center">Cal.diy</h3>

  <p align="center">
    The community-driven, open-source scheduling platform.
    <br />
    <a href="https://github.com/calcom/cal.diy"><strong>GitHub</strong></a>
    <br />
    <a href="https://github.com/calcom/cal.diy/issues">Issues</a>
    &middot;
    <a href="./CONTRIBUTING.md">Contributing</a>
  </p>
</p>

<p align="center">
   <a href="https://github.com/calcom/cal.diy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple" alt="License"></a>
   <a href="https://github.com/calcom/cal.diy/stargazers"><img src="https://img.shields.io/github/stars/calcom/cal.diy" alt="Github Stars"></a>
   <a href="https://github.com/calcom/cal.diy/pulse"><img src="https://img.shields.io/github/commit-activity/m/calcom/cal.diy" alt="Commits-per-month"></a>
   <a href="https://hub.docker.com/r/calcom/cal.diy"><img src="https://img.shields.io/docker/pulls/calcom/cal.diy" alt="Docker Pulls"></a>
   <a href="https://github.com/calcom/cal.diy/issues?q=is:issue+is:open+label:%22%F0%9F%99%8B%F0%9F%8F%BB%E2%80%8D%E2%99%82%EF%B8%8Fhelp+wanted%22"><img src="https://img.shields.io/badge/Help%20Wanted-Contribute-blue"></a>
   <a href="https://contributor-covenant.org/version/1/4/code-of-conduct/"><img src="https://img.shields.io/badge/Contributor%20Covenant-1.4-purple" /></a>
</p>

<!-- ABOUT THE PROJECT -->

## About Cal.diy

<img width="100%" alt="booking-screen" src="https://github.com/calcom/cal.diy/assets/8019099/407e727e-ff19-4ca4-bcae-049dca05cf02">

**Cal.diy** is the community-driven, fully open-source scheduling platform — a fork of [Cal.com](https://cal.com) with all enterprise/commercial code removed.

Cal.diy is **100% MIT-licensed** with no proprietary "Enterprise Edition" features. It's designed for individuals and self-hosters who want full control over their scheduling infrastructure without any commercial dependencies.

### What's different from Cal.com?

- **No enterprise features** — Teams, Organizations, Insights, Workflows, SSO/SAML, and other EE-only features have been removed
- **No license key required** — Everything works out of the box, no Cal.com account or license needed
- **100% open source** — The entire codebase is licensed under MIT, no "Open Core" split
- **Community-maintained** — Contributions are welcome and go directly into this project (see [CONTRIBUTING.md](./CONTRIBUTING.md))

> **Note:** Cal.diy is a self-hosted project. There is no hosted/managed version. You run it on your own infrastructure.

### Built With

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [React.js](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma.io](https://prisma.io/)
- [Daily.co](https://daily.co/)

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here’s what you need to run Cal.diy.

- Node.js (Version: >=18.x)
- PostgreSQL (Version: >=13.x)
- Yarn _(recommended)_

> If you want to enable any of the available integrations, you may want to obtain additional credentials for each one. More details on this can be found below under the [integrations section](#integrations).

## Development

### Setup

1. Clone the repo (or fork https://github.com/calcom/cal.diy/fork)

   ```sh
   git clone https://github.com/calcom/cal.diy.git
   ```

   > If you are on Windows, run the following command in Git Bash with admin privileges:
   > `git clone -c core.symlinks=true https://github.com/calcom/cal.diy.git`

2. Go to the project folder

   ```sh
   cd cal.diy
   ```

3. Install packages with yarn

   ```sh
   yarn
   ```

4. Set up your `.env` file

   - Duplicate `.env.example` to `.env`
   - Use `openssl rand -base64 32` to generate a key and add it under `NEXTAUTH_SECRET` in the `.env` file.
   - Use `openssl rand -base64 24` to generate a key and add it under `CALENDSO_ENCRYPTION_KEY` in the `.env` file.
   - Ensure `NODE_ENV` and `REDIS_URL` are set as they are required for local development.

 > **Windows users:** Replace the `packages/prisma/.env` symlink with a real copy to avoid a Prisma error (`unexpected character / in variable name`):
 >
 > ```sh
 > # Git Bash / WSL
 > rm packages/prisma/.env && cp .env packages/prisma/.env
 > ```

5. Set up Node
   If your Node version does not meet the project's requirements as instructed by the docs, "nvm" (Node Version Manager) allows using Node at the version required by the project:

   ```sh
   nvm use
   ```

   You first might need to install the specific version and then use it:

   ```sh
   nvm install && nvm use
   ```

   You can install nvm from [here](https://github.com/nvm-sh/nvm).

#### Quick start with `yarn dx`

> - **Requires Docker and Docker Compose to be installed**
> - Will start a local Postgres instance with a few test users - the credentials will be logged in the console

```sh
yarn dx
```

**Default credentials created:**

| Email | Password | Role |
|-------|----------|------|
| `free@example.com` | `free` | Free user |
| `pro@example.com` | `pro` | Pro user |
| `trial@example.com` | `trial` | Trial user |
| `admin@example.com` | `ADMINadmin2022!` | Admin user |
| `onboarding@example.com` | `onboarding` | Onboarding incomplete |

You can use any of these credentials to sign in at [http://localhost:3000](http://localhost:3000)

> **Tip**: To view the full list of seeded users and their details, run `yarn db-studio` and visit [http://localhost:5555](http://localhost:5555)

#### Development tip

1. Add `export NODE_OPTIONS="--max-old-space-size=16384"` to your shell script to increase the memory limit for the node process. Alternatively, you can run this in your terminal before running the app. Replace 16384 with the amount of RAM you want to allocate to the node process.

2. Add `NEXT_PUBLIC_LOGGER_LEVEL={level}` to your .env file to control the logging verbosity for all tRPC queries and mutations.\
   Where {level} can be one of the following:

   `0` for silly \
   `1` for trace \
   `2` for debug \
   `3` for info \
   `4` for warn \
   `5` for error \
   `6` for fatal

   When you set `NEXT_PUBLIC_LOGGER_LEVEL={level}` in your .env file, it enables logging at that level and higher. Here's how it works:

   The logger will include all logs that are at the specified level or higher. For example: \

   - If you set `NEXT_PUBLIC_LOGGER_LEVEL=2`, it will log from level 2 (debug) upwards, meaning levels 2 (debug), 3 (info), 4 (warn), 5 (error), and 6 (fatal) will be logged. \
   - If you set `NEXT_PUBLIC_LOGGER_LEVEL=3`, it will log from level 3 (info) upwards, meaning levels 3 (info), 4 (warn), 5 (error), and 6 (fatal) will be logged, but level 2 (debug) and level 1 (trace) will be ignored. \

```sh
echo 'NEXT_PUBLIC_LOGGER_LEVEL=3' >> .env
```

for Logger level to be set at info, for example.

#### Gitpod Setup

1. Click the button below to open this project in Gitpod.

2. This will open a fully configured workspace in your browser with all the necessary dependencies already installed.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/calcom/cal.diy)

#### Manual setup

1. Configure environment variables in the `.env` file. Replace `<user>`, `<pass>`, `<db-host>`, and `<db-port>` with their applicable values

   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   ```

   <details>
   <summary>If you don't know how to configure the DATABASE_URL, then follow the steps here to create a quick local DB</summary>

   1. [Download](https://www.postgresql.org/download/) and install PostgreSQL locally (if you don't have it already).

   2. Create your own local db by executing `createDB <DB name>`

   3. Now open your psql shell with the DB you created: `psql -h localhost -U postgres -d <DB name>`

   4. Inside the psql shell execute `\conninfo`. And you will get the following info.
      ![image](https://user-images.githubusercontent.com/39329182/236612291-51d87f69-6dc1-4a23-bf4d-1ca1754e0a35.png)

   5. Now extract all the info and add it to your DATABASE_URL. The url would look something like this
      `postgresql://postgres:postgres@localhost:5432/Your-DB-Name`. The port is configurable and does not have to be 5432.

   </details>

   If you don't want to create a local DB. Then you can also consider using services like railway.app, Northflank or render.

   - [Setup postgres DB with railway.app](https://docs.railway.app/guides/postgresql)
   - [Setup postgres DB with Northflank](https://northflank.com/guides/deploy-postgres-database-on-northflank)
   - [Setup postgres DB with render](https://render.com/docs/databases)

2. Copy and paste your `DATABASE_URL` from `.env` to `.env.appStore`.

3. Set up the database using the Prisma schema (found in `packages/prisma/schema.prisma`)

   In a development environment, run:

   ```sh
   yarn workspace @calcom/prisma db-migrate
   ```

   In a production environment, run:

   ```sh
   yarn workspace @calcom/prisma db-deploy
   ```

4. Run [mailhog](https://github.com/mailhog/MailHog) to view emails sent during development

   > **_NOTE:_** Required when `E2E_TEST_MAILHOG_ENABLED` is "1"

   ```sh
   docker pull mailhog/mailhog
   docker run -d -p 8025:8025 -p 1025:1025 mailhog/mailhog
   ```

5. Run (in development mode)

   ```sh
   yarn dev
   ```

#### Setting up your first user

##### Approach 1

1. Open [Prisma Studio](https://prisma.io/studio) to look at or modify the database content:

   ```sh
   yarn db-studio
   ```

1. Click on the `User` model to add a new user record.
1. Fill out the fields `email`, `username`, `password`, and set `metadata` to empty `{}` (remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)) and click `Save 1 Record` to create your first user.
   > New users are set on a `TRIAL` plan by default. You might want to adjust this behavior to your needs in the `packages/prisma/schema.prisma` file.
1. Open a browser to [http://localhost:3000](http://localhost:3000) and login with your just created, first user.

##### Approach 2

Seed the local db by running

```sh
cd packages/prisma
yarn db-seed
```

The above command will populate the local db with dummy users.

### E2E-Testing

Be sure to set the environment variable `NEXTAUTH_URL` to the correct value. If you are running locally, as the documentation within `.env.example` mentions, the value should be `http://localhost:3000`.

```sh
# In a terminal just run:
yarn test-e2e

# To open the last HTML report run:
yarn playwright show-report test-results/reports/playwright-html-report
```

#### Resolving issues

##### E2E test browsers not installed

Run `npx playwright install` to download test browsers and resolve the error below when running `yarn test-e2e`:

```
Executable doesn't exist at /Users/alice/Library/Caches/ms-playwright/chromium-1048/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

### Upgrading from earlier versions

1. Pull the current version:

   ```sh
   git pull
   ```

1. Check if dependencies got added/updated/removed

   ```sh
   yarn
   ```

1. Apply database migrations by running <b>one of</b> the following commands:

   In a development environment, run:

   ```sh
   yarn workspace @calcom/prisma db-migrate
   ```

   (This can clear your development database in some cases)

   In a production environment, run:

   ```sh
   yarn workspace @calcom/prisma db-deploy
   ```

1. Check for `.env` variables changes

   ```sh
   yarn predev
   ```

1. Start the server. In a development environment, just do:

   ```s
