<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://github.com/user-attachments/assets/ce7c2ecf-6097-469a-8512-c846a9fb665d" height="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Cal.com is using the [Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ yarn install
```

## Prisma setup

```bash
$ yarn prisma generate
```

## Env setup

Copy `.env.example` to `.env` and fill values.

## Add license Key to Deployment table in DB

id, logo, theme, licenseKey, agreedLicenseAt:-
1, null, null, '00000000-0000-0000-0000-000000000000', '2023-05-15 21:39:47.611'

Replace with your actual license key.

your CALCOM_LICENSE_KEY env var need to contain the same value

.env
CALCOM_LICENSE_KEY=00000000-0000-0000-0000-000000000000

## Running the app

# Development

```bash
$ yarn run start
```

OR if you don't want to use docker, you can run following command.

```bash
$ yarn dev:no-docker
```

Additionally you can run following command(in different terminal) to ensure that any change in any of the dependencies is rebuilt and detected. It watches platform-libraries, platform-constants, platform-enums, platform-utils, platform-types.

```bash
$ yarn run dev:build:watch
```

If you are making changes in packages/platform/libraries, you should run the following command too that would connect your local packages/platform/libraries to the api/v2

```bash
$ yarn local
```

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```




## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# e2e tests in watch mode
$ yarn test:e2e:watch 

# run specific e2e test file in watch mode
$ yarn test:e2e:watch --testPathPattern=filePath

# test coverage
$ yarn run test:cov
```

## Conventions

### Guards
1. In case a guard would return "false" for "canActivate" instead throw ForbiddenException with an error message containing guard name and the error.
2. In case a guard would return "false" for "canActivate" DO NOT cache the result in redis, because we don't want that someone is forbidden, updates whatever was the problem, and then has to wait for cache to expire. We only cache in redis guard results where "canAccess" is "true".
3. If you use ApiAuthGuard but want that only specific auth method is allowed, for example, api key, then you also need to add `@ApiAuthGuardOnlyAllow(["API_KEY"])` under the `@UseGuards(ApiAuthGuard)`. Shortly, use `ApiAuthGuardOnlyAllow` to specify which auth methods are allowed by `ApiAuthGuard`. If `ApiAuthGuardOnlyAllow` is not used or nothing is passed to it or empty array it means that
all auth methods are allowed.

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
