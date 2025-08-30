## Pipedrive Integration via Revert

#### Obtaining Pipedrive Client ID and Secret

- Open [Pipedrive Developers Corner](https://developers.pipedrive.com/) and sign in to your account, or create a new one
- Go to Settings > (company name) Developer Hub
- Create a Pipedrive app, using the steps mentioned [here](https://pipedrive.readme.io/docs/marketplace-creating-a-proper-app#create-an-app-in-5-simple-steps)
  - You can skip this step and use the default revert Pipedrive app
- Set `https://app.revert.dev/oauth-callback/pipedrive` as a callback url for your app
- **Get your client_id and client_secret**:
  - Go to the "OAuth & access scopes" tab of your app
  - Copy your client_id and client_secret

#### Obtaining Revert API keys

- Create an account on Revert if you don't already have one. (https://app.revert.dev/sign-up)
- Login to your revert dashboard (https://app.revert.dev/sign-in) and click on `Customize your apps` - `Pipedrive`
- Enter the `client_id` and `client_secret` you copied in the previous step
- Enter the `client_id` and `client_secret` previously copied to `Settings > Admin > Apps > CRM > Pipedrive` by clicking the `Edit` button on the app settings.
