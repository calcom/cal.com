### Obtaining Webex Client ID and Secret

1. Create a [Webex](https://www.webex.com/) acount, if you don't already have one.
2. Go to [Webex for Developers](https://developer.webex.com/) and sign into to your Webex account. (Note: If you're creating a new account, create it on [Webex](https://www.webex.com/), not on [Webex for Developers](https://developer.webex.com/))
3. On the upper right, click the profile icon and go to ["My Webex Apps"](https://developer.webex.com/my-apps)
4. Click on "Create a New App" and select ["Integration"](https://developer.webex.com/my-apps/new/integration)
5. Choose "No" for "Will this use a mobile SDK?"
6. Give your app a name.
7. Upload an icon or choose one of the default icons.
8. Give your app a short description.
9. Set the Redirect URI as `<Cal.com URL>/api/integrations/webex/callback` replacing Cal.com URL with the URI at which your application runs.
10. Select the following scopes: "meeting:schedules_read", "meeting:schedules_write".
11. Click "Add Integration".
12. Copy the Client ID and Client Secret and add these while enabling the app through Settings -> Admin -> Apps interface
