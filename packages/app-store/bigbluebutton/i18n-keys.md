# Translation Keys for BigBlueButton Integration

Add these keys to `apps/web/public/static/locales/en/common.json`:

```json
{
  "bigbluebutton_connected": "Connected to BigBlueButton",
  "bigbluebutton_setup": "Connect BigBlueButton",
  "bigbluebutton_setup_description": "Connect your self-hosted BigBlueButton server to automatically create meeting rooms for your bookings.",
  "bigbluebutton_server_url": "BigBlueButton Server URL",
  "bigbluebutton_server_url_hint": "The base URL of your BigBlueButton server (e.g. https://bbb.example.com/bigbluebutton)",
  "bigbluebutton_shared_secret": "Shared Secret",
  "bigbluebutton_shared_secret_placeholder": "Enter your BBB shared secret",
  "bigbluebutton_shared_secret_hint": "Found in /etc/bigbluebutton/bbb-web.properties or via `sudo bbb-conf --secret`",
  "bigbluebutton_checksum_algorithm": "Checksum Algorithm",
  "bigbluebutton_setup_help": "Need help finding your server URL and shared secret? See the <1>BigBlueButton API documentation</1>."
}
```

## Note on `bigbluebutton_setup_help`

This key uses React-i18next `<Trans>` interpolation. The `<1>...</1>` placeholder maps to
the first (index 1) component passed to `<Trans components={[..., <a>]}>`.

Previously this was split into two keys (`bigbluebutton_setup_help` + `bigbluebutton_api_docs`)
concatenated in the JSX, which hard-coded English word order and broke proper localization for
languages where the link text appears at a different position in the sentence.

The single-key `Trans` approach allows translators to position the link tag anywhere in the
translated string without UI code changes.
