# Cal.com Public API (Enterprise Only)

## This will be the new public enterprise-only API

This is the public REST api for cal.com.

## NextJS + TypeScript

It's a barebones **NextJS** + **TypeScript** project leveraging the nextJS API with a pages/api folder.

## No react

It doesn't have react or react-dom as a dependency, and will only be used by a redirect as a folder or subdomain on cal.com with maybe a v1 tag like:

- `v1.api.cal.com`
- `api.cal.com/v1`
- `app.cal.com/api/v1/`



## API Endpoint  Validation

The API uses `zod` library like our main web repo. It validates that either GET query parameters or POST body content's are valid and up to our spec. It gives appropiate errors when parsing result's with schemas.

## Testing with Jest + node-mocks-http