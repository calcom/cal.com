# README

This is an example app that acts as the source of truth for Cal.com Apps credentials. This app is capable of generating the access_token itself and then sync those to Cal.com app.

## How to start
`yarn dev` starts the server on port 5100. After this open http://localhost:5100 and from there you would be able to manage the tokens for various Apps.

## Endpoints
http://localhost:5100/api/getToken should be set as the value of env variable CALCOM_CREDENTIAL_SYNC_ENDPOINT in Cal.com