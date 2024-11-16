## Pipedrive Integration

#### Obtaining Pipedrive Client ID and Secret

- Open [Pipedrive Developers Corner](https://developers.pipedrive.com/) and sign in to your account, or create a new one
- Go to Settings > (company name) Developer Hub
- Create a Pipedrive app, using the steps mentioned [here](https://pipedrive.readme.io/docs/marketplace-creating-a-proper-app#create-an-app-in-5-simple-steps)
  - You can skip this step and use the default revert Pipedrive app
- Set `${WEBAPP_URL}/api/integrations/pipedrive-crm/callback` as a callback url for your app
- **Get your client_id and client_secret**:
  - Go to the "OAuth & access scopes" tab of your app
  - Copy your client_id and client_secret
  - Paste the Client ID and Secret Key in the required fields at ${WEBAPP_URL}/apps/pipedrive-crm/setup and save them. You should be redirected to a Pipedrive page after saving to confirm installation.
