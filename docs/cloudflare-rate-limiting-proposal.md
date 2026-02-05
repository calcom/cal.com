# Cloudflare Enterprise Advanced Rate Limiting Configuration Proposal

This document outlines the recommended Cloudflare Enterprise Advanced Rate Limiting configuration to replace the Unkey IP-based rate limiting that was previously implemented in the application code.

## Overview

We are migrating from Unkey rate limiting to Cloudflare Enterprise Advanced Rate Limiting for IP-based rate limiting. Cloudflare provides more powerful rate limiting capabilities including:

- **JA3/JA4 Fingerprinting**: TLS fingerprinting to identify clients beyond just IP addresses
- **Bot Management Integration**: Combine rate limiting with bot scores
- **Geographic Rules**: Apply different limits based on geography
- **Edge Execution**: Rate limiting happens at the edge, reducing load on origin servers

## Endpoints to Rate Limit

### 1. Booking Creation Endpoints

| Endpoint | Previous Unkey Config | Recommended Cloudflare Config |
|----------|----------------------|------------------------------|
| `POST /api/book/event` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |
| `POST /api/book/recurring-event` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |
| `POST /api/book/instant-event` | 1 req/10min per IP | 1 req/10min per IP + JA4 fingerprint |

**Cloudflare Rule Configuration:**

```yaml
# Rule: Booking Creation Rate Limit
expression: |
  (http.request.uri.path eq "/api/book/event" or 
   http.request.uri.path eq "/api/book/recurring-event") and 
  http.request.method eq "POST"
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 10
  period: 60
mitigation_timeout: 60
response:
  status_code: 429
  content: "Rate limit exceeded. Try again in 60 seconds."
  content_type: "application/json"
```

```yaml
# Rule: Instant Meeting Rate Limit (stricter)
expression: |
  http.request.uri.path eq "/api/book/instant-event" and 
  http.request.method eq "POST"
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 1
  period: 600  # 10 minutes
mitigation_timeout: 600
response:
  status_code: 429
  content: "Rate limit exceeded. Try again in 10 minutes."
  content_type: "application/json"
```

### 2. Authentication Endpoints

| Endpoint | Previous Unkey Config | Recommended Cloudflare Config |
|----------|----------------------|------------------------------|
| `POST /api/auth/forgot-password` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |
| `POST /api/auth/reset-password` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |
| `POST /api/auth/signup` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |

**Cloudflare Rule Configuration:**

```yaml
# Rule: Auth Endpoints Rate Limit
expression: |
  (http.request.uri.path eq "/api/auth/forgot-password" or
   http.request.uri.path eq "/api/auth/reset-password" or
   http.request.uri.path eq "/api/auth/signup") and
  http.request.method eq "POST"
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 10
  period: 60
mitigation_timeout: 60
response:
  status_code: 429
  content: "Rate limit exceeded. Try again in 60 seconds."
  content_type: "application/json"
```

### 3. Booking Cancellation (Unauthenticated)

| Endpoint | Previous Unkey Config | Recommended Cloudflare Config |
|----------|----------------------|------------------------------|
| `POST /api/cancel` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |
| `DELETE /api/cancel` | 10 req/60s per IP | 10 req/60s per IP + JA4 fingerprint |

**Note:** Authenticated users are still rate limited by Unkey using their userId.

**Cloudflare Rule Configuration:**

```yaml
# Rule: Cancel Booking Rate Limit (unauthenticated)
expression: |
  http.request.uri.path eq "/api/cancel" and
  (http.request.method eq "POST" or http.request.method eq "DELETE")
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 10
  period: 60
mitigation_timeout: 60
response:
  status_code: 429
  content: "Rate limit exceeded. Try again in 60 seconds."
  content_type: "application/json"
```

### 4. API v1 Endpoints

| Endpoint | Previous Unkey Config | Recommended Cloudflare Config |
|----------|----------------------|------------------------------|
| `/api/v1/*` | 30 req/60s per userId | 30 req/60s per API key + IP + JA4 |

**Cloudflare Rule Configuration:**

```yaml
# Rule: API v1 Rate Limit
expression: |
  starts_with(http.request.uri.path, "/api/v1/")
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
  - http.request.uri.query  # Includes apiKey parameter
rate_limit:
  requests_per_period: 30
  period: 60
mitigation_timeout: 60
response:
  status_code: 429
  content: '{"message": "Rate limit exceeded"}'
  content_type: "application/json"
```

### 5. Global Rate Limit (Previously in proxy.ts)

| Scope | Previous Unkey Config | Recommended Cloudflare Config |
|-------|----------------------|------------------------------|
| All requests | 200 req/60s per path+IP | 200 req/60s per IP + JA4 |

**Cloudflare Rule Configuration:**

```yaml
# Rule: Global Rate Limit
expression: |
  true  # Apply to all requests
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 200
  period: 60
mitigation_timeout: 60
response:
  status_code: 429
  content: "Rate limit exceeded. Try again later."
  content_type: "text/plain"
```

## Advanced Configuration Recommendations

### JA3/JA4 Fingerprinting

JA4 fingerprinting provides better client identification than IP alone:

```yaml
# Use JA4 as a characteristic for all rate limiting rules
characteristics:
  - ip.src
  - cf.bot_management.ja4
```

This helps identify clients that:
- Share the same IP (NAT, corporate networks, VPNs)
- Rotate IPs to evade rate limits
- Use automated tools with consistent TLS fingerprints

### Bot Score Integration

For endpoints prone to bot abuse, consider adding bot score conditions:

```yaml
# Stricter limits for suspected bots
expression: |
  http.request.uri.path eq "/api/auth/signup" and
  http.request.method eq "POST" and
  cf.bot_management.score lt 30
action: block
characteristics:
  - ip.src
  - cf.bot_management.ja4
rate_limit:
  requests_per_period: 3  # Much stricter for suspected bots
  period: 60
```

### Geographic Considerations

Apply different limits based on geography if needed:

```yaml
# Stricter limits for high-risk regions
expression: |
  http.request.uri.path eq "/api/auth/signup" and
  ip.geoip.country in {"XX" "YY" "ZZ"}
action: block
characteristics:
  - ip.src
rate_limit:
  requests_per_period: 5
  period: 60
```

## Rule Priority Order

Configure rules in this priority order (highest to lowest):

1. **Instant Meeting** - Strictest limit (1 req/10min)
2. **Authentication Endpoints** - Sensitive operations
3. **Booking Creation** - Core functionality
4. **Booking Cancellation** - User actions
5. **API v1** - Developer API
6. **Global Rate Limit** - Catch-all

## Monitoring and Alerting

Set up Cloudflare analytics and alerts for:

1. **Rate Limit Triggers**: Monitor when rate limits are hit
2. **JA4 Fingerprint Anomalies**: Unusual fingerprint patterns
3. **Geographic Anomalies**: Unexpected traffic patterns
4. **Bot Score Distribution**: Track bot traffic trends

## Migration Checklist

- [ ] Create all rate limiting rules in Cloudflare dashboard
- [ ] Test rules in "Log" mode before enabling "Block"
- [ ] Monitor for false positives during initial rollout
- [ ] Gradually enable blocking for each rule
- [ ] Remove UNKEY_ROOT_KEY from environment (optional, still used for other rate limits)
- [ ] Update monitoring dashboards to use Cloudflare analytics

## Rate Limits Still Using Unkey

The following rate limits remain in Unkey as they use user-specific identifiers:

| Feature | Key Pattern | Limit |
|---------|-------------|-------|
| Login | `{hashedEmail}` | 10 req/60s |
| Booking cancellation (authenticated) | `api:cancel-user:{userId}` | 10 req/60s |
| 2FA setup | `api:totp-setup:{userId}` | 10 req/60s |
| 2FA enable | `api:totp-enable:{userId}` | 10 req/60s |
| 2FA disable | `api:totp-disable:{userId}` | 10 req/60s |
| SMS sending (short-term) | `handleSendingSMS:*` | 50 req/5min |
| SMS sending (monthly) | `sms:user:{userId}` | 250 req/30d |
| Email verification | Various patterns | 10 req/60s |
| Team member invite | `invitedBy:{userId}` | 10 req/60s |
| Team member remove | `removeMember.{userId}` | 10 req/60s |
| Secondary email | `addSecondaryEmail:{userId}` | 10 req/60s |
| Org code verification | `verifyCode:{hashedEmail}` | 10 req/60s |
| Routing forms | `form:{formId}:hash:{responseHash}` | 10 req/60s |
| AI phone call | `createPhoneCall:{userId}` | 20 req/day |
