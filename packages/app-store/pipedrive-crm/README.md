## Pipedrive Integration via Revert

#### Obtaining Pipedrive Client ID and Secret

- Open [Pipedrive Developers Corner](https://developers.pipedrive.com/) and sign in to your account, or create a new one
- Go to Settings > (company name) Developer Hub
- Create a Pipedrive app, using the steps mentioned [here](https://pipedrive.readme.io/docs/marketplace-creating-a-proper-app#create-an-app-in-5-simple-steps)
  - You can skip this step and use the default revert Pipedrive app
- Set `${WEBAPP_URL}/api/integrations/pipedrive-crm/callback` as a callback url for your app
- **Get your client_id and client_secret**:
  - Go to the "OAuth & access scopes" tab of your app
  - Copy your client_id and client_secret

#### Installing Pipedrive in cal.com

- GO to Apps in cal.com and click on `Crm` filter -> `Pipedrive`
- Click on Install App
- Select Account
- Enter the `client_id` and `client_secret` you copied from the Pipedrive developer-hub
- Click on Save
