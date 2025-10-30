apps/api/README.md

Overview
The API proxy forwards the client's browser time zone to backend services using the HTTP header:
x-user-timezone

This header contains the browser-detected IANA time zone string (for example, "America/Los_Angeles"). In addition, the server looks for two cookies to respect a user's explicit timezone setting:

- user_timezone — the user's chosen timezone (IANA string, e.g. "America/Los_Angeles")
- user_timezone_preferred — a flag indicating the user wants the server to prefer the chosen timezone

Recommended timezone values
- Use IANA timezone identifiers, e.g.:
  - America/Los_Angeles
  - Europe/London
  - Asia/Tokyo

Precedence rules (server behavior)
1. If the cookie user_timezone_preferred exists and equals the string "true" (case-sensitive), the server will prefer the value in user_timezone.
2. If user_timezone_preferred is not present or not equal to "true", the server ignores user_timezone and uses the forwarded header x-user-timezone (the browser timezone).
3. If neither header nor cookies convey a timezone, the server falls back to UTC.

Front-end migration notes (what the client must do)
When a user changes their timezone in settings, the front-end must:
- Update the user_timezone cookie to the new IANA timezone string.
- If the user marks the timezone as "preferred" (meaning they want to always use it), set user_timezone_preferred to "true".
- If the user unchecks or removes their preference, remove user_timezone_preferred or set it to a value other than "true" (e.g., "false") so the server will revert to using x-user-timezone.
- If the user clears their timezone setting, delete user_timezone so the server falls back to the browser timezone.

Cookie attribute recommendations
- Set cookies with Path=/ so they apply to the whole app.
- Use Secure and SameSite=Lax (or Strict) for production.
- Prefer server-set cookies for HttpOnly if sensitive; client-side code cannot set HttpOnly.
- Use a reasonable expiration (e.g., max-age=31536000 for one year) or manage via server.

Minimal client examples (plain JavaScript)
Set the user's timezone (one-liner; add Secure/SameSite on server or via response headers if needed):
document.cookie = "user_timezone=America/Los_Angeles; path=/; max-age=31536000";

Set the preferred flag so the server will prefer the cookie value:
document.cookie = "user_timezone_preferred=true; path=/; max-age=31536000";

Unset/delete the timezone (causes server to fall back to browser timezone/header):
document.cookie = "user_timezone=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

Unset/delete the preferred flag:
document.cookie = "user_timezone_preferred=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

Notes/Troubleshooting
- If users report the booker is showing their browser timezone instead of their account timezone, verify:
  - The front-end updated user_timezone when the user changed settings.
  - user_timezone_preferred is set to "true" only when the user explicitly chose to prefer their account timezone.
  - The proxy is forwarding x-user-timezone.
- Typical cause of the issue described in the ticket: user changed timezone in settings but the front-end did not update/delete the cookies (or left user_timezone_preferred set to "true"), so the server continued to use the wrong value.

If you need an example utility to centralize cookie updates in the front-end, implement one place that updates both cookies whenever the user changes timezone or toggles the "use as preferred" option.