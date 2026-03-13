---
title: Google
description: Set up Google Calendar integration for Cal.diy.
---

# Google

#### Obtaining the Google API Credentials

1. **Open Google API Console** - Go to [Google API Console](https://console.cloud.google.com/apis/dashboard). If you don't have a project in your Google Cloud subscription, create one before proceeding. Under the Dashboard pane, select "Enable APIs and Services".

2. **Search for the Google Calendar API** - In the search box, type "calendar" and select the Google Calendar API search result.

3. **Enable the Google Calendar API** - Enable the selected API to proceed.

4. **Configure the OAuth Consent Screen** - Go to the [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) from the side pane. Select the app type (Internal or External) and enter the basic app details on the first page.

5. **Add Calendar Scopes** - On the Scopes page, select "Add or Remove Scopes". Search for Calendar.event and select the scopes with values `.../auth/calendar.events`, `.../auth/calendar.readonly`, and then click "Update".

6. **Add Test Users** - On the Test Users page, add the Google account(s) you'll be using. Verify details on the last page to complete the consent screen configuration.

7. **Create OAuth Credentials** - From the side pane, select [Credentials](https://console.cloud.google.com/apis/credentials) and then "Create Credentials". Choose "OAuth Client ID".

8. **Select Web Application as the Application Type** - Choose "Web Application" as the Application Type.

9. **Add Authorized Redirect URIs** - Under Authorized redirect URI's, add the URIs:

```
<Cal.com URL>/api/integrations/googlecalendar/callback
<Cal.com URL>/api/auth/callback/google
```

Replace `<Cal.com URL>` with the URL where your application runs.

10. **Download the OAuth Client ID JSON** - The key will be created, redirecting you back to the Credentials page. Select the new client ID under "OAuth 2.0 Client IDs", then click "Download JSON". Copy the JSON file contents and paste the entire string into the `.env` and `.env.appStore` files under the `GOOGLE_API_CREDENTIALS` key.

11. **Set the Google Integration as Internal** - In the `.env` file, set the following environment variable:

```
GOOGLE_LOGIN_ENABLED=false
```

This disables Google sign-in for authentication. It is not required for the Google Calendar app itself, so only set it if you explicitly want Google SSO turned off.

### Adding Google Calendar to Cal.com App Store

After adding Google credentials, you can now add the Google Calendar App to the app store. Repopulate the App store by running:

1. **Repopulate App Store** - Run `yarn workspace @calcom/prisma seed-app-store` to update the app store and include the newly added Google Calendar integration.
