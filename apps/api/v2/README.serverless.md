# Cal.com API v2 Serverless

This directory contains the serverless version of Cal.com API v2, configured to run on Vercel.

## Architecture

The API has been converted from a monolithic NestJS application to individual serverless functions:

- Each controller is mapped to a separate serverless function
- Redis and Bull queues are made optional for serverless environments
- NestJS dependency injection is preserved through a serverless bootstrap pattern

## Files Structure

```
apps/api/v2/
├── api/v2/                    # Vercel serverless function handlers
│   ├── health.ts
│   ├── event-types.ts
│   ├── bookings.ts
│   └── ...
├── src/serverless/            # Serverless-specific code
│   ├── bootstrap.ts           # NestJS app initialization for serverless
│   ├── app.module.ts          # Serverless-compatible app module
│   ├── instrument.ts          # Sentry instrumentation
│   └── queue-mock.service.ts  # Mock service for Bull queues
├── vercel.json                # Vercel deployment configuration
└── package.json               # Updated with serverless build scripts
```

## Key Changes

1. **Redis Service**: Made optional in serverless environments with mock fallback
2. **Bull Queues**: Made optional with mock service for serverless
3. **App Module**: Created serverless-compatible version that conditionally imports Redis/Bull
4. **Bootstrap**: Cached NestJS app instance for better performance
5. **Handlers**: Individual Vercel functions for each API endpoint

## Environment Variables

The serverless version detects the environment using:
- `VERCEL` - Vercel environment
- `AWS_LAMBDA_FUNCTION_NAME` - AWS Lambda environment
- `REDIS_URL` - Optional Redis connection (uses mock if not available)

## Deployment

1. Build the serverless version:
   ```bash
   yarn build:serverless
   ```

2. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

## Development

For local development, the original NestJS application can still be used:

```bash
yarn dev
```

The serverless functions can be tested locally using Vercel CLI:

```bash
vercel dev
```

## CI/CD Notes

This conversion maintains full compatibility with the existing CI/CD pipeline and all automated checks.
