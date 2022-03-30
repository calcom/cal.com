# Cal.com Public API (Enterprise Only)

## This will be the new public enterprise-only API

This is the public REST api for cal.com

## NextJS + TypeScript

It's a barebones **NextJS** + **TypeScript** project leveraging the nextJS API with a pages/api folder.

## No react

It doesn't have react or react-dom as a dependency, and will only be used by a redirect as a folder or subdomain on cal.com with maybe a v1 tag like:

- `api.cal.com/v1`
- `api.cal.com/api/v1`

## API Endpoint Validation

### Zod

The API uses `zod` library like our main web repo. It validates that either GET query parameters or POST body content's are valid and up to our spec. It gives appropiate errors when parsing result's with schemas.

### Next Validations

[Next-Validations Docs](https://next-validations.productsway.com/)
[Next-Validations Repo](https://github.com/jellydn/next-validations)
We also use this useful helper library that let's us wrap our endpoints in a validate HOC that checks the req against our validation schema built out with zod for either query and / or body's requests.

## Testing with Jest + node-mocks-http

We aim to provide a fully tested API for our peace of mind, this is accomplished by using jest + node-mocks-http

## Next.config.js

### Redirects

Since this will only support an API, we redirect the requests to root to the /api folder.
We also added a redirect for future-proofing API versioning when we might need it, without having to resort to dirty hacks like a v1/v2 folders with lots of duplicated code, instead we redirect /api/v*/:rest to /api/:rest?version=*

The priority is the booking-related API routes so people can build their own booking flow, then event type management routes, then availability management routes etc

How to add a new model or endpoint

Basically there's three places of the codebase you need to think about for each feature.

/pages/api/

- This is the most important one, and where your endpoint will live. You will leverage nextjs dynamic routes and expose one file for each endpoint you want to support ideally.

## How the codebase is organized.

## The example resource -model- and it's endpoints

### `pages/api/endpoint/`

GET pages/api/endpoint/index.ts - Read All of your resource
POST pages/api/endpoint/new.ts - Create new resource

### `pages/api/endpoint/[id]/`

GET pages/api/endpoint/[id]/index.ts - Read All of your resource
PATCH pages/api/endpoint/[id]/edit.ts - Create new resource
DELETE pages/api/endpoint/[id]/delete.ts - Create new resource

## `/tests/`

This is where all your endpoint's tests live, we mock prisma calls. We aim for at least 50% global coverage. Test each of your endpoints.

### `/tests/endpoint/`

/tests/endpoint/resource.index.test.ts - Test for your pages/api/endpoint/index.ts file
tests/endpoint/resource.new.test.ts - Create new resource

### `/tests/endpoint/[id]/`

`/tests/endpoint/[id]/resource.index.test.ts` - Read All of your resource
`/tests/endpoint/[id]/resource.edit.test.ts` - Create new resource
`/tests/endpoint/[id]/resource.delete.test.ts` - Create new resource

## `/lib/validations/yourEndpoint.ts`

- This is where our model validations, live, we try to make a 1:1 for db models, and also extract out any re-usable code into the /lib/validations/shared/ sub-folder.
