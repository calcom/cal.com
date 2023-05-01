## Zoho Calendar

### Obtaining Zoho Calendar Client ID and Secret

1. Open [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.
2. From within the API console page, go to "Applications".
3. Click "ADD CLIENT" button top right and select "Server-based Applications".
4. Fill in any information you want in the "Client Details" tab
5. Go to tab "Client Secret" tab.
6. Now copy the Client ID and Client Secret into your app keys in the Cal.com admin panel (`<Cal.com>/settings/admin/apps`).
7. Back in Zoho API Console, set the Redirect URL for OAuth `<Cal.com URL>/api/integrations/zohocalendar/callback` replacing Cal.com URL with the URI at which your application runs.
8. In the "Settings" section check the "Multi-DC" option if you wish to use the same OAuth credentials for all data centers.
9. Click the "Save"/ "UPDATE" button at the bottom footer.
10. You're good to go. Now you can easily add your Zoho Calendar integration in the Cal.com settings.
