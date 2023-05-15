### Steps for building an integration
(This is just to track the procedure of building the integration. Can be removed from README later if not relevant.)
1. Create a [Make.com]() account.
2. Once signed in, at the bottom of the left sidebar, go to `Profile`. Select the `API` tab and click on `Add Token`. Pick a name of the token and choose `Select All` for scopes. Here's the official documentation for [Generating a Make.com authentication token](https://www.make.com/en/api-documentation/authentication-token) that is needed to access the API.
3. Copy the auth token that is generated.
4. Go to `/settings/admin/apps` in your local Calcom instance, select `Make` under `automation` and enable it.