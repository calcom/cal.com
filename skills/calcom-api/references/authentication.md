# Authentication API Reference

Detailed documentation for authentication methods in the Cal.com API v2.

## Authentication Methods

Cal.com API v2 supports two authentication methods:

1. **API Key Authentication** - For direct API access
2. **OAuth/Platform Authentication** - For platform integrations managing users on behalf of others

## API Key Authentication

The primary authentication method for most API consumers.

### Obtaining an API Key

1. Log in to your Cal.com account
2. Navigate to Settings > Developer > API Keys
3. Click "Create new API key"
4. Copy and securely store the generated key

### Using API Keys

Include the API key in the `Authorization` header with the `Bearer` prefix:

```http
GET /v2/bookings
Authorization: Bearer cal_live_abc123xyz...
```

### API Key Format

All Cal.com API keys are prefixed with `cal_`:
- `cal_live_...` - Production API keys
- `cal_test_...` - Test/sandbox API keys (if available)

### Example Request

```bash
curl -X GET "https://api.cal.com/v2/bookings" \
  -H "Authorization: Bearer cal_live_abc123xyz789" \
  -H "Content-Type: application/json"
```

## Refresh API Key

Generate a new API key and invalidate the current one:

```http
POST /v2/api-keys/refresh
Authorization: Bearer cal_live_current_key
Content-Type: application/json

{
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| expiresAt | string | No | ISO 8601 expiration date for the new key |

### Response

```json
{
  "status": "success",
  "data": {
    "apiKey": "cal_live_new_key_xyz..."
  }
}
```

## Platform Authentication (OAuth)

For platform customers building integrations that manage multiple users.

### Headers for Platform Authentication

Platform customers use additional headers alongside or instead of the Bearer token:

| Header | Description |
|--------|-------------|
| `x-cal-client-id` | OAuth client ID |
| `x-cal-secret-key` | OAuth client secret key |
| `Authorization` | Bearer token (managed user access token) |

### Example Platform Request

```bash
curl -X GET "https://api.cal.com/v2/bookings" \
  -H "x-cal-client-id: your_client_id" \
  -H "x-cal-secret-key: your_secret_key" \
  -H "Authorization: Bearer managed_user_access_token" \
  -H "Content-Type: application/json"
```

### When to Use Each Header

**For endpoints acting on behalf of a managed user:**
```http
GET /v2/bookings
x-cal-client-id: your_client_id
x-cal-secret-key: your_secret_key
Authorization: Bearer managed_user_access_token
```

**For platform-level operations (managing OAuth clients):**
```http
GET /v2/oauth-clients
Authorization: Bearer cal_live_platform_admin_key
```

## API Versioning

Many endpoints require a version header:

```http
cal-api-version: 2024-08-13
```

### Example with Version Header

```bash
curl -X POST "https://api.cal.com/v2/bookings" \
  -H "Authorization: Bearer cal_live_abc123" \
  -H "cal-api-version: 2024-08-13" \
  -H "Content-Type: application/json" \
  -d '{"start": "2024-01-15T10:00:00Z", "eventTypeId": 123, ...}'
```

## Authentication Errors

### 401 Unauthorized

Returned when authentication fails:

```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}
```

Common causes:
- Missing `Authorization` header
- Invalid or expired API key
- API key without `cal_` prefix
- Incorrect Bearer token format

### 403 Forbidden

Returned when authenticated but lacking permissions:

```json
{
  "status": "error",
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource"
  }
}
```

Common causes:
- Accessing another user's resources
- Missing required scopes for platform tokens
- Organization/team permission restrictions

## Security Best Practices

1. **Never expose API keys in client-side code**: API keys should only be used in server-side applications

2. **Use environment variables**: Store API keys in environment variables, not in code
   ```bash
   export CAL_API_KEY="cal_live_abc123..."
   ```

3. **Rotate keys regularly**: Use the refresh endpoint to rotate keys periodically

4. **Use minimal permissions**: Request only the scopes/permissions your application needs

5. **Monitor API usage**: Check your Cal.com dashboard for unusual activity

6. **Secure transmission**: Always use HTTPS for API requests

7. **Handle keys securely in logs**: Never log full API keys - redact sensitive portions

## Rate Limiting

API requests are rate limited. When exceeded, you'll receive:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry after 60 seconds."
  }
}
```

### Rate Limit Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds to wait before retrying (on 429) |

## Testing Authentication

Verify your API key is working:

```bash
curl -X GET "https://api.cal.com/v2/me" \
  -H "Authorization: Bearer cal_live_your_api_key" \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "status": "success",
  "data": {
    "id": 12345,
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "timeZone": "America/New_York"
  }
}
```

## Common Authentication Patterns

### Server-Side Integration

```javascript
const CAL_API_KEY = process.env.CAL_API_KEY;

async function getBookings() {
  const response = await fetch('https://api.cal.com/v2/bookings', {
    headers: {
      'Authorization': `Bearer ${CAL_API_KEY}`,
      'Content-Type': 'application/json',
      'cal-api-version': '2024-08-13'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Handling Token Refresh

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (response.status === 401) {
    // Refresh the API key
    const refreshResponse = await fetch('https://api.cal.com/v2/api-keys/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (refreshResponse.ok) {
      const { data } = await refreshResponse.json();
      apiKey = data.apiKey;
      // Retry original request with new key
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${apiKey}`
        }
      });
    }
  }
  
  return response;
}
```

## Troubleshooting

### "Invalid API key" Error

1. Verify the key starts with `cal_`
2. Check for extra whitespace or characters
3. Ensure the key hasn't been revoked or expired
4. Confirm you're using the correct environment (production vs test)

### "Missing Authorization header" Error

1. Ensure the header name is exactly `Authorization`
2. Include the `Bearer ` prefix (with space)
3. Check for typos in the header name

### Platform Authentication Issues

1. Verify both `x-cal-client-id` and `x-cal-secret-key` are provided
2. Ensure the managed user access token is valid
3. Check that the OAuth client has the required permissions
