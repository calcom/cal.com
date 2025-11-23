### Obtaining Zoho Bigin Client ID and Secret

1. Open [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.
2. Click "ADD CLIENT" button top right and select "Server-based Applications".
3. Set the Redirect URL for OAuth `<Cal.com URL>/api/integrations/zoho-bigin/callback` replacing Cal.com URL with the URI at which your application runs.
4. Go to tab "Client Secret" tab.
5. Now copy the Client ID and Client Secret to your .env.appStore file into the `ZOHO_BIGIN_CLIENT_ID` and `ZOHO_BIGIN_CLIENT_SECRET` fields.
6. In the "Settings" section check the "Multi-DC" option if you wish to use the same OAuth credentials for all data centers.
7. You're good to go. Now you can easily add Zoho Bigin from the [Cal.com](https://cal.com) app store.
