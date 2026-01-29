Cal.com api v2 is a [Nest.js](https://github.com/nestjs/nest) project.

# Local development
This setup will allow you to develop with api v2 locally. If you want to also test atoms locally with platform's example app,
then proceed to `apps/api/v2/README-PLATFORM.md` instead.

1. Install dependencies
```bash
$ yarn install
```
2. Download and install Docker on your computer and then make sure it is running. You simply need to open Docker dashboard.
3. Make sure that mailhog is running - it is used by v2 to send emails locally. You can start it by:
```bash
$ cd packages/emails && yarn dx
```
4. Setup api v2 environment - make a copy of `apps/api/v2/.env.example` and rename it to `apps/api/v2/.env` - it has almost all the required values setup - ones you need to add will be explained below.
- Then copy the value of `NEXTAUTH_SECRET` from there to the root `.env` `NEXTAUTH_SECRET`. If you have `NEXTAUTH_SECRET` already in the root `.env` then you can paste that value in `apps/api/v2/.env`.
```
Note: make sure that the value of `NEXTAUTH_SECRET` is the same in both the root `.env` and in the api v2 `.env`.
```
5. Setup license key. In the Deployment table in database create the following entry:
```
id, logo, theme, licenseKey, agreedLicenseAt:-
1, null, null, '00000000-0000-0000-0000-000000000000', '2023-05-15 21:39:47.611'
```
Then in the `apps/api/v2/.env` set the license key environment variable:
```
CALCOM_LICENSE_KEY="00000000-0000-0000-0000-000000000000"
```
6. (optional) Prisma setup and database seeding - if you need to setup and seed database you can do it:
```bash
$ cd packages/prisma
$ yarn prisma generate
$ yarn prisma migrate dev
$ yarn db-seed
```
7. Proceed to the next section to start api v2

# Running api v2

Start api v2 using:
```bash
$ yarn dev
```

Sometimes it happens that v2 api restarts because some unrelated log of build files changed if you are running it while cal web app is running. If it happens and is annoying you, you can just build it and then run without watch mode:
```
cd apps/api/v2
yarn dev:build
yarn start
```

Api v2 depends on various platform packages "platform-libraries, platform-constants, platform-enums, platform-utils, platform-types" so if any of them change you might need to restart api v2 so it rebuild these dependencies and picks up the changes.

Notably, you can run following command(in different terminal) to ensure that any change in any of the dependencies is rebuilt and detected. It watches platform-libraries, platform-constants, platform-enums, platform-utils, platform-types.

```bash
$ yarn run dev:build:watch
```

OR if you don't want to use docker, you can run following command.
```bash
$ yarn dev:no-docker
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# run specific e2e test file in watch mode
$ yarn run test:e2e some-file.e2e-spec.ts

# test coverage
$ yarn run test:cov
```

# Conventions

### Guards
1. In case a guard would return "false" for "canActivate" instead throw ForbiddenException with an error message containing guard name and the error.
2. In case a guard would return "false" for "canActivate" DO NOT cache the result in redis, because we don't want that someone is forbidden, updates whatever was the problem, and then has to wait for cache to expire. We only cache in redis guard results where "canAccess" is "true".
3. If you use ApiAuthGuard but want that only specific auth method is allowed, for example, api key, then you also need to add `@ApiAuthGuardOnlyAllow(["API_KEY"])` under the `@UseGuards(ApiAuthGuard)`. Shortly, use `ApiAuthGuardOnlyAllow` to specify which auth methods are allowed by `ApiAuthGuard`. If `ApiAuthGuardOnlyAllow` is not used or nothing is passed to it or empty array it means that
all auth methods are allowed.

