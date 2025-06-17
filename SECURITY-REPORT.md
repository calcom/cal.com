# Security Report: Sensitive Information Disclosure & Broken Access Control

## Affected Domains
- app.cal.com
- cal.com
- i.cal.com

## Impact
High (Sensitive Information Disclosure, Unauthorized Meeting Actions, User Impersonation)

## Summary
Multiple endpoints on cal.com subdomains expose highly sensitive user information, including:

- Personal names and email addresses
- Past meeting details (who, when, what, where)
- LinkedIn profiles
- Video meeting links (active and ended)
- Links that allow scheduling/rescheduling on behalf of others without verification

This data is exposed via URLs indexed by VirusTotal.

## Technical Details
(Include your full technical explanation here if you want, or leave as is.)

## OWASP Top 10 References
- A01:2021 - Broken Access Control
- A03:2021 - Injection
- A06:2021 - Vulnerable and Outdated Components
- A09:2021 - Security Logging and Monitoring Failures
- A02:2021 - Cryptographic Failures

## Recommendations
- Tokenize/Expire URLs
- Require Authentication
- Remove PII from URLs
- Prevent Listing in Search Engines
- Audit and Revoke Exposed Links

## Related Issue
https://github.com/calcom/cal.com/issues/21667
