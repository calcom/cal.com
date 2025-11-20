# Cal.com Companion OAuth Setup Guide

This guide will help you set up OAuth authentication for the Cal.com Companion app (both mobile and browser extension).

## Prerequisites

1. A Cal.com account with platform access
2. Permission to create OAuth applications in Cal.com

## Step 1: Create OAuth Client in Cal.com

1. Log into your Cal.com account
2. Navigate to **Settings** → **Platform** (https://app.cal.com/settings/platform)
3. Click **Create OAuth Client** or **New Application**
4. Fill in the application details:
   - **Name**: `Cal.com Companion`
   - **Description**: `Mobile and browser extension companion for Cal.com`
   - **Website URL**: Your website or GitHub repository URL
   - **Redirect URIs**: 
     - For browser extension: `http://localhost:8081/auth/callback`
     - For mobile app: `expo-wxt-app://auth/callback`
     - For production web: Your production domain callback URL

5. Save the application and note down:
   - **Client ID** (you'll need this)
   - **Client Secret** (for server-side flows, if provided)

## Step 2: Configure the Companion App

### Environment Variables

Create a `.env` file in the companion directory with:

```env
# Required: Your Cal.com OAuth Client ID
EXPO_PUBLIC_CALCOM_CLIENT_ID=your_client_id_here

# Optional: Custom redirect URIs
EXPO_PUBLIC_WEB_REDIRECT_URI=http://localhost:8081/auth/callback
EXPO_PUBLIC_MOBILE_REDIRECT_URI=expo-wxt-app://auth/callback
```

### For Development

1. Copy your Client ID from Cal.com platform dashboard
2. Replace `your_client_id_here` in the `.env` file
3. Restart the development server

### For Browser Extension

1. Update `wxt.config.js`:
   ```javascript
   oauth2: {
     client_id: 'your-actual-client-id',
     scopes: []
   }
   ```

2. Ensure redirect URI matches: `http://localhost:8081/auth/callback`

### For Mobile App

1. Update `app.json` to include the URL scheme:
   ```json
   {
     "expo": {
       "scheme": "expo-wxt-app",
       "platforms": ["ios", "android"]
     }
   }
   ```

2. Ensure redirect URI matches: `expo-wxt-app://auth/callback`

## Step 3: Test the Setup

1. **Install dependencies**: 
   ```bash
   npm install
   ```

2. **For browser extension**:
   ```bash
   npm run ext:dev
   ```
   - Load the unpacked extension in Chrome
   - Click on the extension popup
   - Try the OAuth login flow

3. **For mobile app**:
   ```bash
   npm start
   ```
   - Open in Expo Go or simulator
   - Try the OAuth login flow

## Troubleshooting

### Common Issues

1. **"OAuth configuration is invalid"**
   - Check that `EXPO_PUBLIC_CALCOM_CLIENT_ID` is set correctly
   - Verify the Client ID matches exactly from Cal.com dashboard

2. **"Invalid redirect URI"**
   - Ensure redirect URIs in Cal.com dashboard match exactly
   - Check for trailing slashes or protocol mismatches

3. **"Authorization failed"**
   - Verify Cal.com OAuth client is active and approved
   - Check that the client has proper permissions

4. **Browser extension not working**
   - Ensure `identity` permission is granted
   - Check that `chrome.identity` API is available
   - Verify manifest.json has correct oauth2 configuration

5. **Mobile app redirect not working**
   - Verify URL scheme is configured in app.json
   - Test deep linking: `npx uri-scheme open com.calcom.companion://auth/callback --ios`

### Debug Mode

Enable debug logging by setting:
```env
EXPO_PUBLIC_DEBUG_OAUTH=true
```

This will show detailed OAuth flow logs in the console.

## Security Notes

- Never commit Client IDs or secrets to version control
- Use different OAuth clients for development and production
- Regularly rotate OAuth credentials
- Monitor OAuth application usage in Cal.com dashboard

## Production Deployment

For production deployment:

1. Create separate OAuth clients for production environments
2. Update redirect URIs to match production domains
3. Set production environment variables
4. Test the full OAuth flow in production environment

## Support

If you encounter issues:

1. Check the Cal.com documentation: https://cal.com/docs
2. Review OAuth error logs in browser console
3. Verify OAuth client configuration in Cal.com dashboard
4. Check that all redirect URIs are properly configured

## Example Working Configuration

```env
# .env file
EXPO_PUBLIC_CALCOM_CLIENT_ID=cal_live_1234567890abcdef
EXPO_PUBLIC_WEB_REDIRECT_URI=http://localhost:8081/auth/callback
EXPO_PUBLIC_MOBILE_REDIRECT_URI=expo-wxt-app://auth/callback
```

```javascript
// wxt.config.js
oauth2: {
  client_id: 'cal_live_1234567890abcdef',
  scopes: []
}
```

```json
// app.json
{
  "expo": {
    "scheme": "expo-wxt-app"
  }
}
```