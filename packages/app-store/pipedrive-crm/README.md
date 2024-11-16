## Pipedrive Integration

#### Obtaining Pipedrive Client ID and Secret

1. Log into your Pipedrive account and in the Developer Hub select/create your app.
2. Under the Basic Info Tab, change the Callback URL to: `${WEBAPP_URL}/api/integrations/pipedrive-crm/callback`
3. In the OAuth & access scopes Tab, enable full access to Activities and Contacts.
4. In the same OAuth & access scopes Tab, copy the Client ID and Client secret. Be sure to keep these secured, as you won't be able to see the secret again.
5. Paste the Client ID and Secret Key in the required field above and save them. You should be redirected to a Pipedrive page after saving to confirm installation.
