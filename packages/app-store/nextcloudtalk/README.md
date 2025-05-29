### Obtaining Nextcloud Client ID and Secret

1. Create a [Nextcloud account](https://nextcloud.com/sign-up), if you don't already have one or [self-host Nextcloud](https://nextcloud.com/install/#instructions-server).
2. Sign in as admin on your Nextcloud.
3. On the upper right, click the profile icon and go to "Administration settings".
4. In the left panel under "Administration" click on "Security".
5. Scroll down until the end of the page to "OAuth 2.0 clients".
6. Under "Add client" give your client a name, e.g. "Cal.com".
7. Set the Redirection URI as `<Cal.com URL>/api/integrations/nextcloudtalk/callback` replacing [Cal.com](https://cal.com) URL with the URI at which your application runs.
8. Click "Add".
9. Copy the Client Identifier and Secret key and add these while enabling the app through Settings -> Admin -> Apps interface
