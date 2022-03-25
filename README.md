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
