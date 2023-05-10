### Obtaining Webex Client ID and Secret

1. Open [Webex for Developers](https://developer.webex.com/) and sign into to your Webex account, or create a new one.
2. On the upper right, click the profile icon and go to ["My Webex Apps"](https://developer.webex.com/my-apps)
3. Click on "Create a New App" and select ["Integration"](https://developer.webex.com/my-apps/new/integration)
4. Choose "No" for "Will this use a mobile SDK?"
5. Give your app a name.
6. Upload an icon or choose one of the default icons.
7. Give your app a short description.
8. Set the Redirect URI as `<Cal.com URL>/api/integrations/webex/callback` replacing Cal.com URL with the URI at which your application runs.
9. Select the following scopes: "meeting:schedules_read", "meeting:schedules_write".
10. Click "Add Integration".
11. Copy the Client ID and Client Secret and add these while enabling the app through Settings -> Admin -> Apps interface
