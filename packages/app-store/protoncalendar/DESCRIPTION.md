# Proton Calendar

Sync your Proton Calendar with Cal.com using a secure ICS feed.

## Features
- **Read-Only Sync**: Cal.com reads your Proton Calendar for busy slots
- **Privacy First**: Uses Proton's secure ICS feed — no password or API key sharing
- **Encrypted Storage**: ICS URL is encrypted at rest with `CALENDSO_ENCRYPTION_KEY`
- **SSRF Protected**: Strict hostname validation, HTTPS-only
- **Recurring Events**: Properly expands RRULEs within the query window

## Setup
1. Open [Proton Calendar](https://calendar.proton.me) → **Settings** → **Calendars**
2. Select your calendar → **Share** → **Create link**
3. Copy the ICS feed URL
4. In Cal.com → **Apps** → **Proton Calendar** → **Install**
5. Paste the ICS URL and save

## How it works
Cal.com fetches the ICS feed on each availability check. Events (including recurring) are parsed
and returned as busy times. Since Proton uses a zero-knowledge architecture, the ICS feed
approach is the only way to integrate without compromising Proton's security model.
