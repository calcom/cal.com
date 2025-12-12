# Build, Test & Development Commands

## Development Commands

- `yarn dev` - Start development server for web app
- `yarn dev:all` - Start web, website, and console apps
- `yarn dev:api` - Start web app with API proxy and API
- `yarn dev:console` - Start web app with console
- `yarn dx` - Start development with database setup

## Build Commands

- `yarn build` - Build all packages and apps
- `yarn build:ai` - Build AI package specifically
- `yarn clean` - Remove build artifacts (node_modules, .next, .turbo, dist)

## Lint & Type Check

- `yarn lint` - Run ESLint on codebase
- `yarn lint:fix` - Run ESLint and fix issues
- `yarn lint:report` - Generate lint report
- `yarn type-check` - Run TypeScript type checking
- `yarn format` - Format code with Prettier

## Testing Commands

### Unit Tests

- `yarn test` - Run unit tests (vitest)
- `yarn test <filename>` - Run tests for specific file
- `yarn test <filename> -t "<testName>"` - Run specific test by name for specific file
- `yarn tdd` - Run tests in watch mode
- `yarn test:ui` - Run tests with UI interface

### Integration Tests

- `yarn test -- --integrationTestsOnly` - Run integration tests (vitest)
- `yarn test <filename> -- --integrationTestsOnly` - Run integration tests for specific file
- `yarn test <filename> -t "<testName>" -- --integrationTestsOnly` - Run specific integration test by name for specific file


### End-to-End Tests

- `yarn e2e` - Run end-to-end tests (Playwright)
- `yarn e2e <filename>` - Run E2E tests for specific file
- `yarn e2e <filename> --grep "<testName>"` - Run specific E2E test by name
- `yarn e2e:app-store` - Run app store E2E tests
- `yarn e2e:embed` - Run embed E2E tests
- `yarn test-e2e` - Run database seed + E2E tests

## Database Commands

- `yarn prisma` - Run Prisma CLI commands
- `yarn db-seed` - Seed database with test data
- `yarn db-deploy` - Deploy database migrations
- `yarn db-studio` - Open Prisma Studio
- `psql "postgresql://postgres:@localhost:5432/calendso"` - Connect to local PostgreSQL database

## App Store Commands

- `yarn create-app` - Create new app store integration
- `yarn edit-app` - Edit existing app
- `yarn delete-app` - Delete app
- `yarn app-store:build` - Build app store
- `yarn app-store:watch` - Watch app store for changes

## Useful Development Patterns

### Running Single Tests

```bash
# Unit test specific file
yarn vitest run packages/lib/some-file.test.ts

# Integration test specific file
yarn test routing-form-response-denormalized.integration-test.ts -- --integrationTestsOnly

# E2E test specific file
yarn e2e tests/booking-flow.e2e.ts

# Run specific test by name
yarn e2e tests/booking-flow.e2e.ts --grep "should create booking"
```

### Environment Setup

- Copy `.env.example` to `.env` and configure
- Copy `.env.appStore.example` to `.env.appStore` for app store development
- Run `yarn dx` for initial development setup with database
