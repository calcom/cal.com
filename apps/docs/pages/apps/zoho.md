---
title: Zoho
description: Set up Zoho CRM, Calendar, and Bigin integrations for Cal.diy.
---

# Zoho

#### Obtaining ZohoCRM Client ID and Secret

1. **Sign into Zoho API Console** - Go to [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.

2. **Go to Applications** - From the API console page, navigate to "Applications".

3. **Add a New Client** - Click the "ADD CLIENT" button at the top right and select "Server-based Applications".

4. **Fill in Client Details** - Enter any desired information in the "Client Details" tab.

5. **Go to the Client Secret tab** - Navigate to the "Client Secret" tab.

6. **Save Client ID and Secret in Admin Panel** - Copy the Client ID and Client Secret to your app keys in the Cal.com admin panel at `<Cal.com>/settings/admin/apps`.

7. **Set the Redirect URL for OAuth** - Set the Redirect URL for OAuth to:

```
<Cal.com URL>/api/integrations/zohocrm/callback
```

Replace `<Cal.com URL>` with your application URL.

8. **Enable Multi-DC Option** - In the "Settings" section, check the "Multi-DC" option if you wish to use the same OAuth credentials for all data centers.

9. **Save your settings** - Click "Save" or "UPDATE" at the bottom of the page.

10. **Integration is Ready** - Your ZohoCRM integration can now be easily added in the Cal.com settings.

#### Obtaining Zoho Calendar Client ID and Secret

1. **Sign into Zoho API Console** - Go to [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.

2. **Create a New Server-based Application** - Choose "Server-based Applications" and set the Redirect URL for OAuth to:

```
<Cal.com URL>/api/integrations/zohocalendar/callback
```

Replace `<Cal.com URL>` with your application URL.

3. **Fill in Client Details** - Enter any information you want in the "Client Details" tab.

4. **Go to the Client Secret tab** - Navigate to the "Client Secret" tab.

5. **Save Credentials in Cal.com Admin Panel** - Copy the Client ID and Client Secret to your app keys in the Cal.com admin panel at:

```
<Cal.com>/settings/admin/apps
```

6. **Enable Multi-DC Option** - In the "Settings" section of Zoho API Console, check the "Multi-DC" option if you wish to use the same OAuth credentials across data centers.

7. **Save Settings** - Click "Save" or "UPDATE" at the bottom of the page.

8. **Complete Zoho Calendar Integration** - Your Zoho Calendar integration is now ready and can be managed at:

```
/settings/my-account/calendars
```

9. **Access Zoho Calendar** - You can access your Zoho calendar at [https://calendar.zoho.com/](https://calendar.zoho.com/).

> If you use multiple calendars with Cal, make sure to enable the toggle to prevent double-bookings across calendars. This setting can be found at `/settings/my-account/calendars`.

#### Obtaining Zoho Bigin Client ID and Secret

1. **Sign into Zoho API Console** - Go to [Zoho API Console](https://api-console.zoho.com/) and sign into your account, or create a new one.

2. **Add a New Client for Zoho Bigin** - Click the "ADD CLIENT" button at the top right, and select "Server-based Applications".

3. **Set the Redirect URL for OAuth** - Set the Redirect URL for OAuth to:

```
<Cal.com URL>/api/integrations/zoho-bigin/callback
```

Replace `<Cal.com URL>` with your application URL.

4. **Go to the Client Secret tab** - Navigate to the "Client Secret" tab.

5. **Save Client ID and Secret in Admin Panel** - Copy the Client ID and Client Secret to your app keys in the Cal.com admin panel at `<Cal.com>/settings/admin/apps`.

6. **Enable Multi-DC Option** - In the "Settings" section, check the "Multi-DC" option if you wish to use the same OAuth credentials across data centers.

7. **Complete Zoho Bigin Integration** - Your Zoho Bigin integration is now ready and can be added from the Cal.com app store.
