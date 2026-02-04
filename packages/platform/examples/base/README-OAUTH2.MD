This readme will guide you how to run the examples app with an OAuth 2.0 client.

## Setup
First, we need to create test OAuth client. You can do it manually by creating the following in the OAuthClient table:
  {
    "clientId": "1c70be53f35aa480a5e3146d361fd993d265e564d2d86a203df3adbd05186517",
    "redirectUri": "http://localhost:4321",
    "clientSecret": "970db2cf14112013ba3a510b945294fef8737d42ee58c32031d2351692068ce7",
    "name": "atoms examples app oauth 2 client",
    "logo": null,
    "clientType": "confidential",
    "isTrusted": false,
    "createdAt": "2026-01-22 15:50:40.722",
    "purpose": "test atoms examples app with oauth 2",
    "rejectionReason": null,
    "status": "approved",
    "userId": 10,
    "websiteUrl": "http://localhost:4321"
  }
Or you can do it automatically by:
In the root .env set:
SEED_OAUTH2_CLIENT_ID=1c70be53f35aa480a5e3146d361fd993d265e564d2d86a203df3adbd05186517
SEED_OAUTH2_CLIENT_SECRET_HASHED=970db2cf14112013ba3a510b945294fef8737d42ee58c32031d2351692068ce7
Then run yarn db-reset in the prisma folder which will create an OAuth client for the admin@example.com user.

Second, we need to setup environment for the examples app. Go to packages/platform/examples/base/.env and paste the following
NEXT_PUBLIC_OAUTH2_CLIENT_ID="1c70be53f35aa480a5e3146d361fd993d265e564d2d86a203df3adbd05186517"
OAUTH2_CLIENT_SECRET_PLAIN="2df0d9b1450ea95f2376fce5bc1d352e2d7a253d7e1c68a96a44745413b7dc4c"
OAUTH2_REDIRECT_URI="http://localhost:4321"
NEXT_PUBLIC_CALCOM_API_URL="http://localhost:5555/api/v2"

NEXT_PUBLIC_OAUTH2_MODE="true"
Here we have OAUTH2_CLIENT_SECRET_PLAIN in plain because it will be used for api request when exchanging authorization code for tokens. NEXT_PUBLIC_OAUTH2_MODE tells that the examples app will run not with platform OAuth client but with OAuth 2.0 client, so in the packages/platform/examples/base/src/pages/_app.tsx we will use CalOAuthProvider and not CalProvider.

## Usage
1. Before running the example app `packages/platform/examples/base` run `rm -f prisma/dev.db && yarn prisma db push` to reset its SQLite. If you don't and there are users already then an entry for the `admin@example.com` will not be created.
2. Start web app and examples app (it is important that examples app runs on localhost:4321 because that will be redirect uri)
3. Login as admin@example.com into cal webapp using password ADMINadmin2022!
4. Visit this link http://localhost:3000/auth/oauth2/authorize?client_id=1c70be53f35aa480a5e3146d361fd993d265e564d2d86a203df3adbd05186517&redirect_uri=http://localhost:4321&state=texas or if you have setup localhost:3000 to map to app.cal.local http://app.cal.local:3000/auth/oauth2/authorize?client_id=1c70be53f35aa480a5e3146d361fd993d265e564d2d86a203df3adbd05186517&redirect_uri=http://localhost:4321&state=texas and authorize test OAuth client. You will be redirected to localhost:4321?code=abc and this route will exchange the authorization code for access and refresh tokens for the admin@example.com and store them in the examples app SQLite database.
5. Examples app is ready to use. If you update, let's say an availability, then it will be reflected in the availability of admin@example.com in the web app running locally.