# Mintlify Chat API Security Migration

## Overview

This migration addresses a critical security vulnerability where the Mintlify API key was exposed in client-side code via the `NEXT_PUBLIC_MINTLIFY_CHAT_API_KEY` environment variable.

## Changes Made

### 1. Server-Side Validation Layer
**File**: `packages/lib/server/mintlifyChatValidation.ts`

Created comprehensive validation helpers that:
- Sanitize user input to prevent XSS and injection attacks
- Validate message payloads with size limits (10KB max)
- Prevent path traversal attacks
- Remove control characters from input
- Enforce strict topicId format (alphanumeric, dashes, underscores only)
- Sanitize response headers to only allow safe headers through

### 2. API Proxy Routes
**Files**: 
- `apps/web/app/api/mintlify-chat/topic/route.ts`
- `apps/web/app/api/mintlify-chat/message/route.ts`

Created Next.js API routes that:
- Proxy all Mintlify traffic through the Cal.com backend
- Keep the API key secure on the server side
- Inject Authorization headers server-side
- Validate and sanitize all user input before proxying
- Stream responses back to the client
- Provide proper error handling

### 3. Updated Client-Side Code
**File**: `packages/features/mintlify-chat/util.ts`

Updated client functions to:
- Call `/api/mintlify-chat/*` proxy endpoints instead of Mintlify directly
- Remove Authorization header logic (now handled server-side)
- Add proper error handling

### 4. Environment Variable Migration
**Files**: 
- `packages/features/kbar/Kbar.tsx`
- `turbo.json`

Changed:
- `NEXT_PUBLIC_MINTLIFY_CHAT_API_KEY` → `MINTLIFY_CHAT_API_KEY` (server-only)
- Feature detection now only checks for `NEXT_PUBLIC_CHAT_API_URL`

### 5. Comprehensive Test Suite
**File**: `apps/web/app/api/mintlify-chat/__tests__/route.test.ts`

Added regression tests that verify:
- ✅ Successful topic creation and message sending
- ✅ Invalid JSON rejection
- ✅ Oversized message rejection (>10KB)
- ✅ Path traversal attack prevention
- ✅ Control character sanitization
- ✅ Invalid topicId format rejection
- ✅ Response header sanitization
- ✅ **API key never exposed in responses or error messages**
- ✅ Validation runs on every request
- ✅ Configuration validation

## Migration Instructions

### For Developers

1. **Update Environment Variables**
   
   Rename your environment variable:
   ```bash
   # OLD (insecure - exposed to client)
   NEXT_PUBLIC_MINTLIFY_CHAT_API_KEY=your-api-key
   
   # NEW (secure - server-only)
   MINTLIFY_CHAT_API_KEY=your-api-key
   ```

2. **Rebuild Your Application**
   
   The old API key will no longer be bundled in client JavaScript:
   ```bash
   yarn build
   ```

3. **Verify Security**
   
   - Check your browser's dev tools → Network tab
   - Verify requests now go to `/api/mintlify-chat/*`
   - Verify no API key appears in JavaScript bundles
   - Search your built files: `grep -r "MINTLIFY_CHAT_API_KEY" .next/` should return nothing

### For Deployment

Update your deployment environment variables in:
- Vercel Dashboard
- Docker/Kubernetes secrets
- CI/CD pipeline secrets
- Any other deployment platforms

## Security Benefits

### Before (Insecure)
```
Browser → Mintlify API
        ↑ (API key exposed in bundle)
```

- ❌ API key visible in client JavaScript
- ❌ Key extractable from bundled code
- ❌ No input validation
- ❌ No rate limiting capability
- ❌ Direct client → Mintlify communication

### After (Secure)
```
Browser → Cal.com API → Mintlify API
                      ↑ (API key injected server-side)
```

- ✅ API key never sent to browser
- ✅ Input validation and sanitization
- ✅ Control character filtering
- ✅ Path traversal prevention
- ✅ Response header sanitization
- ✅ Server-side rate limiting capability
- ✅ Centralized error handling
- ✅ Audit logging capability

## Testing

Run the test suite:
```bash
yarn test apps/web/app/api/mintlify-chat/__tests__/route.test.ts
```

All tests should pass, confirming:
- API key is never exposed
- Malicious input is rejected
- Validation works correctly
- Error messages don't leak sensitive information

## Rollback

If issues arise, you can temporarily rollback by:

1. Revert the changes to `packages/features/mintlify-chat/util.ts`
2. Add back `NEXT_PUBLIC_MINTLIFY_CHAT_API_KEY` to your environment
3. Rebuild and redeploy

However, this reintroduces the security vulnerability and should only be temporary.

## Additional Security Recommendations

1. **Rate Limiting**: Consider adding rate limiting to the proxy endpoints
2. **Authentication**: Consider requiring user authentication for chat features
3. **Monitoring**: Add logging and monitoring for suspicious patterns
4. **API Key Rotation**: Regularly rotate your Mintlify API key
5. **CSP Headers**: Ensure Content Security Policy headers are configured

## Questions or Issues?

If you encounter any issues with this migration, please:
1. Check the test suite passes
2. Verify environment variables are set correctly
3. Review server logs for errors
4. Open an issue with detailed error messages

