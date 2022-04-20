# Cal.com Public API (Enterprise Only)

This is the public REST api for cal.com. It exposes CRUD Endpoints of all our most important resources. It makes it easy for anyone to integrate with cal at the programming level.

> The priority is the booking-related API routes so people can build their own booking flow, then event type management routes, then availability management routes etc

## Stack

- NextJS
- TypeScript
- Prisma
- No tRPC **

** (for now) We hook directly into prisma client, but probably should look into adding a new @calcom/trpc package that adds pagination and such stuff and can be shared between webapp and API.


## How to run it

First clone the main repo with --recursive-submodules flag. This will clone our monorepo, and all the private git submodules within it.
``
Be sure to be authenticated in gh-cli or via PAT in your shell, as this will clone private repos that requires this (website, api)
``

`cp .env.example .env`

`yarn workspace @calcom/api dev
## API Authentication (API Keys)

The API requires a valid apiKey query param to be passed:
You can generate them at <https://app.cal.com/settings/security>

For example:
```sh
GET https://api.cal.com/v1/users?apiKey={INSERT_YOUR_CAL.COM_API_KEY_HERE}
```

API Keys optionally may have expiry dates, if they are expired they won't work. If you create an apiKey without a userId relation, it won't work either for now as it relies on it to establish the current authenticated user.

In the future we might add support for header Beaer Auth if we need to or our customers require it.

## Redirects

Since this is an API only project, we don't want to have to type /api/ in all the routes, and so redirect all traffic to api, so a call to `api.cal.com/v1` will resolve to `api.cal.com/api/v1`

Likewise, v1 is added as param query called version to final /api call so we don't duplicate endpoints in the future for versioning if needed.

## API Endpoint Validation

We validate that only the supported methods are accepted at each endpoint, so in

- **/endpoint**: you can only [GET] (all) and [POST] (create new)
- **/endpoint/id**: you can read create and edit [GET, PATCH, DELETE]

### Zod Validations

The API uses `zod` library like our main web repo. It validates that either GET query parameters or POST body content's are valid and up to our spec. It gives errors when parsing result's with schemas and failing validation.

We use it in several ways, but mainly, we first import the auto-generated schema from @calcom/prisma for each model, which lives in `lib/validations/`

We have some shared validations which several resources require, like baseApiParams which parses apiKey in all requests, or querIdAsString or TransformParseInt which deal with the id's coming from req.query.

- **[*]BaseBodyParams** that omits any values from the model that are too sensitive or we don't want to pick when creating a new resource like id, userId, etc.. (those are gotten from context or elswhere)

- **[*]Public** that also omits any values that we don't want to expose when returning the model as a response, which we parse against before returning all resources.

- **[*]BodyParams** which merges both `[*]BaseBodyParams.merge([*]RequiredParams);`

- **withValid[*]** which is currently not being much used because is only useful in only post endpoints (we do post/get all in same file). This would validate the req.body of a POST call to API against our BaseBodyParams validation

### Next Validations

[Next-Validations Docs](https://next-validations.productsway.com/)
[Next-Validations Repo](https://github.com/jellydn/next-validations)
We also use this useful helper library that let's us wrap our endpoints in a validate HOC that checks the req against our validation schema built out with zod for either query and / or body's requests.

## Testing with Jest + node-mocks-http

We aim to provide a fully tested API for our peace of mind, this is accomplished by using jest + node-mocks-http

## Next.config.js

### How to add a new model or endpoint

Basically there's three places of the codebase you need to think about for each feature.

/pages/api/

- This is the most important one, and where your endpoint will live. You will leverage nextjs dynamic routes and expose one file for each endpoint you want to support ideally.

## How the codebase is organized

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

## Endpoints matrix

| resource                 | get [id] | get all  | create  | edit  | delete |
|--------------------------|----------|----------|---------|-------|--------|
| attendees                |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| availabilities           |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| booking-references       |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| daily-event-references   |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| destination-calendars    |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| event-type-custom-inputs |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| event-types              |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| memberships              |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| payments                 |     ✅    |    ✅    |    ❌   |   ❌  |    ❌   |
| schedules                |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| selected-calendars       |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| teams                    |     ✅    |    ✅    |    ✅   |   ✅  |    ✅   |
| users                    |     ✅    |   👤[1]  |    ✅   |   ✅  |    ✅   |

## Models missing userId relation

- daily-event-references
- destination-calendars


## Models from database that are not exposed

mostly because they're deemed too sensitive can be revisited if needed. most are expected to be used via cal's webapp.

- [ ] Api Keys
- [ ] Credentials
- [ ] Webhooks
- [ ] ResetPasswordRequest
- [ ] VerificationToken
- [ ] ReminderMail
- [ ] 
## Documentation (OpenAPI)

You will see that each endpoint has a comment at the top with the annotation `@swagger` with the documentation of the endpoint, **please update it if you change the code!** This is what auto-generates the OpenAPI spec by collecting the YAML in each endpoint and parsing it in /docs alongside the json-schema (auto-generated from prisma package, not added to code but manually for now, need to fix later)

### @calcom/apps/swagger

The documentation of the API lives inside the code, and it's auto-generated, the only endpoints that return without a valid apiKey are the homepage, with a JSON message redirecting you to the docs. and the /docs endpoint, which returns the OpenAPI 3.0 JSON Spec. Which SwaggerUi then consumes and generates the docs on.

## Deployment

`scripts/vercel-deploy.sh`
The API is deployed to vercel.com, it uses a similar deployment script to website or webapp, and requires transpilation of several shared packages that are part of our turborepo ["app-store", "prisma", "lib", "ee"]
in order to build and deploy properly.

## Envirorment variables

DATABASE_URL=
API_KEY_PREFIX=cal_# This can be changed per envirorment so cal_test_ for staging for example.

If you're self-hosting under our commercial license, you can use any prefix you want for api keys. either leave the default cal_ (not providing any envirorment variable) or modify it
