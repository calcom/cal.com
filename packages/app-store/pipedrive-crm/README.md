## Pipedrive Integration via Revert

#### Obtaining Pipedrive Client ID and Secret

- Open [Pipedrive Developers Corner](https://developers.pipedrive.com/) and sign in to your account, or create a new one
- Go to Settings > (company name) Developer Hub
- Create a Pipedrive app, using the steps mentioned [here](https://pipedrive.readme.io/docs/marketplace-creating-a-proper-app#create-an-app-in-5-simple-steps)
  - You can skip this step and use the default revert Pipedrive app
- Set `{WEBAPP_URL}/api/integrations/pipedrive-crm/callback` as a callback url for your app
- **Get your client_id and client_secret**:
  - Go to the "OAuth & access scopes" tab of your app
  - Select scopes `Activity` and `Person` with full access.
  - Copy your client_id and client_secret
  - Put them inside the pipedrive-crm app keys record in db.