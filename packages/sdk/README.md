# Cal.com Public API SDK

Cal.com SDK for JavaScript
Develop and deploy applications with the Cal.com SDK for JavaScript. The SDK provides first class TypeScript support and makes it easy to call Cal.com API resources using idiomatic JavaScript APIs to build Node.js, web, and mobile web applications on top of our -**app store for time**-

## Stack

### SDK Client auto-generated from our OpenAPI spec

[Cal.com OpenAPI Spec](https://api.cal.com/docs)

It uses `readmeio/api` package to auto-generate a javascript client with all the same available functions matching our API endpoints.

We also extend it with our own types, so you can get autocompletion for all available methods on your IDE when using our SDK
## How to use

```
import { cal } from '@calcom/sdk';

describe('Cal.com SDK', () => {
  cal.auth('cal_{YOUR_API_KEY_HERE}');

  cal.listBookings();
  // returns an array with all your bookings
  
```

## Environment variables

`CAL_API_URL=http://localhost:3002/v1/docs`
If none provided, it defaults to our production API endpoint at: `https://api.cal.com`

`CAL_API_KEY=cal_YOUR_API_KEY_GOES_HERE`
CAL_API_KEY is used for automatically authenticating you when using the SDK, you can also choose to ignore using it and call cal.auth() yourself.

## I am self-hosted (enterprise edition) licensed user, can I use this SDK with my API too?

Yes, you can pass your own environment var, pointing to a valid openapi spec at <https://your-api-endpoint.com/docs>

## How to develop

- Install all the package dependencies with `yarn install`
- yarn prepare will also make `yarn build` (tsc) run automatically after install.

## Testing

We use jest, and test all operationId's for our OpenAPI.
`yarn test`
or from the root monorepo:
``
## Formatting (prettier ) and Linting (ESLint)

`yarn format`
`yarn lint`

## Updates to OpenAPI spect

`yarn reset`
