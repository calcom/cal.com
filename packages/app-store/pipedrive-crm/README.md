## Pipedrive Integration via Revert

#### Obtaining Pipedrive Client ID and Secret

* Open [Pipedrive Developers Corner](https://developers.pipedrive.com/) and sign in to your account, or create a new one
* Go to Settings > (company name) Developer Hub
* Create a Pipedrive app, using the steps mentioned [here](https://pipedrive.readme.io/docs/marketplace-creating-a-proper-app#create-an-app-in-5-simple-steps)
  * You can skip this step and use the default revert Pipedrive app
* Set `https://app.revert.dev/oauth-callback/pipedrive` as a callback url for your app
* **Get your client\_id and client\_secret**:
  * Go to the "OAuth & access scopes" tab of your app
  * Copy your client\_id and client\_secret

#### Obtaining Revert API keys

* Create an account on Revert if you don't already have one. (https://app.revert.dev/sign-up)
* Login to your revert dashboard (https://app.revert.dev/sign-in) and click on "Customize your apps" - "Pipedrive"
* Enter the client\_id and client\_secret you copied in the previous step\*\*
* *(Optional)* Copy the scopes (from the Pipedrive app) and add them to the revert dashboard to get granular control over the scope of your app
  * You can skip this step and use the default revert scopes and permissions
