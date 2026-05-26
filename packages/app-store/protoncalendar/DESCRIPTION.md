# Proton Calendar

Sync your Proton Calendar with Cal.com using a secure ICS feed.

## Features
- **Read-Only Sync**: Cal.com reads your Proton Calendar for busy slots
- **Privacy First**: Uses Proton's secure ICS feed — no password or API key sharing
- **Encrypted Storage**: ICS URL is encrypted at rest with CALENDSO_ENCRYPTION_KEY
- **SSRF Protected**: Strict hostname validation, HTTPS-only
- **Recurring Events**: Properly expands RRULEs within the query window
- **Ghost Event Fix**: Filters out STATUS:CANCELLED events that Proton includes in its ICS feeds

## Setup
1. Open [Proton Calendar](https://calendar.proton.me) → Settings → Calendars
2. Select your calendar → Share → Create link
3. Copy the ICS feed URL
4. In Cal.com → Apps → Proton Calendar → Install
5. Paste the ICS URL and save

## Limitations
- **Read-only**: Proton Calendar has no public API or CalDAV support (end-to-end encryption).
- **Paid plan required**: Calendar sharing via link requires a paid Proton plan.
