# Non-Interactive CLI Sample Commands

The `app-store create` command supports a non-interactive mode when `--name`, `--description`, `--category`, and `--template` flags are all provided. This bypasses the interactive prompts and creates the app directly.

## Available Categories

`analytics`, `automation`, `calendar`, `conferencing`, `crm`, `messaging`, `payment`, `other`

## Available Templates

`basic`, `booking-pages-tag`, `event-type-app-card`, `event-type-location-video-static`, `general-app-settings`, `link-as-an-app`

## Sample Commands

### Link as an App (External Redirect)

Apps that redirect users to an external URL (e.g., Amie, Vimcal, Pipedream).

```bash
yarn app-store create \
  --name "My External App" \
  --description "Redirects users to an external service" \
  --template link-as-an-app \
  --category other \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com" \
  --external-link-url "https://example.com/signup"
```

### Basic App

A minimal installable app with no additional features.

```bash
yarn app-store create \
  --name "My Basic App" \
  --description "A simple installable app" \
  --template basic \
  --category other \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com"
```

### Booking Pages Tag (Analytics)

Analytics/tracking apps that inject scripts into booking pages (e.g., GA4, Fathom, Plausible).

```bash
yarn app-store create \
  --name "My Analytics Tracker" \
  --description "Tracks booking page analytics" \
  --template booking-pages-tag \
  --category analytics \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com"
```

### Event Type App Card

Apps that add a configurable card to event type settings (e.g., Giphy, QR Code).

```bash
yarn app-store create \
  --name "My Event Type Card" \
  --description "Adds a custom card to event type settings" \
  --template event-type-app-card \
  --category other \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com"
```

### Event Type Location Video (Static)

Video conferencing apps that add a static location option to event types (e.g., Facetime, Skype).

```bash
yarn app-store create \
  --name "My Video App" \
  --description "Adds a video conferencing location to event types" \
  --template event-type-location-video-static \
  --category conferencing \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com"
```

### General App Settings

Apps with global settings in the installed apps section (e.g., Weather in your Calendar).

```bash
yarn app-store create \
  --name "My Settings App" \
  --description "An app with global configuration settings" \
  --template general-app-settings \
  --category other \
  --publisher "Cal.com, Inc." \
  --email "support@cal.com"
```

## Flags Reference

| Flag | Alias | Description | Required |
|------|-------|-------------|----------|
| `--name` | `-n` | App name | Yes |
| `--description` | `-d` | App description | Yes |
| `--category` | `-c` | App category | Yes |
| `--template` | `-t` | Base template to use | Yes |
| `--publisher` | `-p` | Publisher name | No (default: `"Your Name"`) |
| `--email` | `-e` | Publisher email | No (default: `"email@example.com"`) |
| `--external-link-url` | - | Redirect URL | Yes (for `link-as-an-app` template) |

If `--name`, `--description`, `--category`, or `--template` are omitted, the CLI falls back to interactive mode.
