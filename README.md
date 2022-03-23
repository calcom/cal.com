<<<<<<< HEAD
# Cal.com Public API (Enterprise Only)
=======
# Public API for Cal.com

## This will be the new public enterprise-only API

It will be a REST API for now, we might want to look into adding a GraphQL endpoint way down the roadmap if it makes sense. For now we think REST should cover what developers need.

## NextJS + TypeScript

It's a barebones **NextJS** + **TypeScript** project leveraging the nextJS API with a pages/api folder.

## NextAuth

Using the new next-auth middleware getToken and getSession for our API auth and any other middleware check we might want to do like user role. enterprise status, api req limit, etc.

The idea is to leverage current `Session` accessToken. next-auth reads the Authorization Header and if it contains a valid JWT Bearer Token, it decodes it.

We'll also need the EmailProvider (to expose VerificationTokens generation) and prisma adapter (to connect with the database)
We will extend it to also be valids PAT's with longer than web auth sessions expiryDates (maybe never expire).

## No react

It doesn't have react or react-dom as a dependency, and will only be used by a redirect as a folder or subdomain on cal.com with maybe a v1 tag like:

- `v1.api.cal.com`
- `api.cal.com/v1`
- `app.cal.com/api/v1/`

## Example

HTTP Request (Use Paw.app/postman/postwoman/hoppscotch)

```
POST /api/jwt HTTP/1.1
authorization: Bearer eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..ik9ibWdgN2Mq-WYH.7qsAwcOtOQyqwjIQ03EkEHy4kpy4GAndbqqQlhczc9xRgn_ycqXn4RbmwWA9LGm2LIXp_MQXMNm-i5vvc7piGZYyTPIGTieLspCYG4CKnZIawjcXmBEiwG9-PafNSUOGJB1O41l-9WbOEZNnIIAlfBTxdM3T13fUP4ese348tbn755Vi27Q_hOKulOfJ-Z-IQCd1OMsmTbuBo537IUkpj979.y288909Yt7mEYWJUAJRqdQ
```

or with cURL

```
curl -X "POST" "http://localhost:3002/api/jwt" \
     -H 'authorization: Bearer eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..ik9ibWdgN2Mq-WYH.7qsAwcOtOQyqwjIQ03EkEHy4kpy4GAndbqqQlhczc9xRgn_ycqXn4RbmwWA9LGm2LIXp_MQXMNm-i5vvc7piGZYyTPIGTieLspCYG4CKnZIawjcXmBEiwG9-PafNSUOGJB1O41l-9WbOEZNnIIAlfBTxdM3T13fUP4ese348tbn755Vi27Q_hOKulOfJ-Z-IQCd1OMsmTbuBo537IUkpj979.y288909Yt7mEYWJUAJRqdQ'
```

Returns:

```{
  "name": null,
  "email": "m@n.es",
  "sub": "cl032mhik0006w4ylrtay2t3f",
  "iat": 1645894473,
  "exp": 1648486473,
  "jti": "af1c04f2-09a8-45b5-a6f0-c35eea9efa9b",
  "userRole": "admin"
}
```



## API Endpoint  Validation

The API uses `zod` library like our main web repo. It validates that either GET query parameters or POST body content's are valid and up to our spec. It gives appropiate errors when parsing result's with schemas.


## Testing




/event-types
GET
/teams
teams/join

GET / PATCH / PUT /users/:id

/users/new
POST
/event-types
/bookings
/availabilties
/schedules

## Users

GET     /users        : Get all users you're an owner / team manager of. Requires Auth.
POST    /users        : Create a new user
GET     /users/{id}   : Get the user information identified by "id"
PUT     /users/{id}   : Update the user information identified by "id"
DELETE  /users/{id}   : Delete user by "id"

## Event Types

/event-types
GET     /event-types        : Get all event-types
POST    /event-types        : Create a new user
GET     /event-types/{id}   : Get the user information identified by "id"
PUT     /event-types/{id}   : Update the user information identified by "id"
DELETE  /event-types/{id}   : Delete user by "id"

## Bookings

/bookings
>>>>>>> 5a71055 (feat: Initial work on event-types, add jest for testing w node-http-mocks)
