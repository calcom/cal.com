# OAuth Security Update: PKCE Required for All Clients

In our continuous effort to improve the security of the Cal.com platform, we are updating our OAuth flow requirements. As of the next release, the legacy `client_secret` authentication mechanism for `CONFIDENTIAL` OAuth clients has been deprecated and completely removed. 

**Proof Key for Code Exchange (PKCE) is now explicitly required for all OAuth clients, regardless of type.**

## Breaking Change & Required Action
If your application was previously configured as a `CONFIDENTIAL` client and relied on `client_secret` for authentication instead of PKCE:
- **Status:** Your token exchanges will immediately begin failing with `400 invalid_request` when this update deploys.
- **Action Required:** You must update your OAuth flow to use PKCE.
  1. Generate a `code_challenge` and `code_challenge_method` when redirecting users to the `/authorize` endpoint.
  2. Provide the corresponding `code_verifier` in the request body when exchanging the authorization code for tokens at the `/token` endpoint.

### Backward Compatibility (Parsing Only)
To prevent payload validation errors in existing libraries, the `client_secret` field remains defined as an optional string in the API schema. However, **it is entirely ignored by the server**. 

If your application continues sending a `client_secret` payload alongside a valid PKCE flow, it will succeed, but a warning will be logged on our side indicating that you are sending a deprecated payload. We recommend removing the `client_secret` from your token exchange payloads entirely.

### Why this change?
PKCE (RFC 7636) is the modern industry standard for securing OAuth 2.0 authorization codes, mitigating authorization code interception attacks. Originally designed for public clients, it is now the recommended best practice for confidential clients as well (OAuth 2.1). By standardizing on PKCE across all clients, we simplify integration requirements and ensure the highest baseline security for all integrators.
