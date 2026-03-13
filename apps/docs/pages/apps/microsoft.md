---
title: Microsoft
description: Set up Microsoft Graph / Office 365 Calendar integration for Cal.diy.
---

# Microsoft

#### Obtaining Microsoft Graph Client ID and Secret

1. **Open Azure App Registration** - Go to [Azure App Registration](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) and select "New registration".

2. **Name your application** - Provide a name for your application to proceed with the registration.

3. **Set who can use this application** - Set "Who can use this application or access this API?" to "Accounts in any organizational directory (Any Azure AD directory - Multitenant)".

4. **Configure the Web redirect URI** - Set the Web redirect URI to:

```
<Cal.com URL>/api/integrations/office365calendar/callback
```

Replace `<Cal.com URL>` with the URL where your application runs.

5. **Obtain and set the MS_GRAPH_CLIENT_ID** - Use the Application (client) ID as the value for `MS_GRAPH_CLIENT_ID` in your `.env` file.

6. **Create a client secret and set MS_GRAPH_CLIENT_SECRET** - Click on "Certificates & secrets", create a new client secret, and use the generated value as the `MS_GRAPH_CLIENT_SECRET` in your `.env` file.
