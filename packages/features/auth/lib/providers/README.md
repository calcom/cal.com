# Authentication Providers

This directory contains custom authentication providers for Cal.com.

## FusionAuth OIDC Provider

The FusionAuth OIDC provider allows users to authenticate using FusionAuth as an OpenID Connect identity provider.

### Important: FusionAuth Tenant Configuration

**⚠️ Critical Configuration Requirement:** In FusionAuth, all tenants within the same instance must use the same issuer URL. The issuer should match the URL where users would view the FusionAuth login page or access the JWKS endpoint.

**Example Configuration:**

- **FusionAuth Login Page:** `https://auth.sampleapp.com`
- **Issuer URL:** `https://auth.sampleapp.com`
- **JWKS Endpoint:** `https://auth.sampleapp.com/.well-known/jwks.json`
- **OpenID Configuration:** `https://auth.sampleapp.com/.well-known/openid_configuration`

### Configuration

To enable FusionAuth OIDC authentication, add the following environment variables to your `.env` file:

```env
# FusionAuth OIDC Configuration
FUSIONAUTH_CLIENT_ID=your_fusionauth_client_id
FUSIONAUTH_CLIENT_SECRET=your_fusionauth_client_secret
FUSIONAUTH_ISSUER=https://auth.sampleapp.com
FUSIONAUTH_LOGIN_ENABLED=true
```

### FusionAuth Setup

1. **Create an OAuth 2.0 Application in FusionAuth:**
   - Log into your FusionAuth admin panel
   - Navigate to Applications → Add Application
   - Set the following configuration:
     - **Name:** Cal.com (or whatever you would like to call the application)
     - **Type:** Web Application
     - **Redirect URLs:** `https://your-cal-domain.com/api/auth/callback/fusionauth-oidc`
     - **Client Authentication:** Required
     - **Enabled Grant Types:** Authorization Code, Refresh Token

2. **Configure Scopes:**
   - Enable the following scopes:
     - `openid` (this is an implicit one, it won't show up in the FusionAuth UI)
     - `profile`
     - `email`

3. **Configure JWT Settings:**
   - Navigate to the **JWT** tab in your FusionAuth application
   - **Enable JWT:** Make sure JWT is enabled for this application
   - **ID Token Signing Algorithm:** Set to `RS256` (Cal.com requires RS256, not HS256)
   - **Access Token Signing Algorithm:** Set to `RS256`

4. **Get Credentials:**
   - Copy the Client ID and Client Secret from your FusionAuth application
   - **Important:** Set the Issuer URL to match your FusionAuth login page URL (e.g., `https://auth.sampleapp.com`)

### Testing Your Configuration

You can test your FusionAuth configuration by accessing these endpoints:

```bash
# Test OpenID Configuration
curl https://auth.sampleapp.com/.well-known/openid_configuration

# Test JWKS Endpoint
curl https://auth.sampleapp.com/.well-known/jwks.json

# Test Issuer Discovery
curl https://auth.sampleapp.com/.well-known/webfinger?resource=https://auth.sampleapp.com
```

**Expected Response Structure:**

```json
{
  "issuer": "https://auth.sampleapp.com",
  "authorization_endpoint": "https://auth.sampleapp.com/oauth2/authorize",
  "token_endpoint": "https://auth.sampleapp.com/oauth2/token",
  "userinfo_endpoint": "https://auth.sampleapp.com/oauth2/userinfo",
  "jwks_uri": "https://auth.sampleapp.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

### Features

- **Email Verification:** Automatically verifies email addresses from FusionAuth
- **Profile Mapping:** Maps FusionAuth user attributes to Cal.com user profile
- **Account Linking:** Supports linking existing Cal.com accounts with FusionAuth identities
- **Organization Support:** Compatible with Cal.com's organization features

### User Flow

1. User clicks "Sign in with FusionAuth" on the login page
2. User is redirected to FusionAuth for authentication
3. After successful authentication, user is redirected back to Cal.com
4. Cal.com creates or links the user account based on the FusionAuth identity
5. User is logged into Cal.com

### Security Considerations

- Uses PKCE (Proof Key for Code Exchange) for enhanced security
- Supports state parameter to prevent CSRF attacks
- Validates email verification status from FusionAuth
- Implements proper token validation and user info retrieval

### Troubleshooting

- Ensure all environment variables are properly set
- Verify the redirect URL is correctly configured in FusionAuth
- Check that the required scopes are enabled in FusionAuth
- **Ensure the FusionAuth issuer URL matches your login page URL**
- Verify that the issuer URL is accessible from your Cal.com instance
- Test the OpenID configuration endpoint to ensure proper discovery
