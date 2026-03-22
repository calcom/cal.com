BigBlueButton is a free, open-source web conferencing system built for virtual learning and online collaboration. Host video meetings entirely on your own server — no third-party cloud required.

## Features

- **HD video & audio** — multi-user webcam and microphone support
- **Screen sharing** — present slides or your entire desktop
- **Shared whiteboard** — real-time collaborative annotation
- **Breakout rooms** — split participants into smaller groups
- **Polling & reactions** — engage your audience during sessions
- **Recording** — record and play back meetings

## Setup

1. You need a running BigBlueButton server (v2.6+). You can self-host or use a commercial hosting provider.
2. In Cal.com, open the BigBlueButton app and enter:
   - **Server URL** — the base URL of your BBB server (e.g. `https://bbb.example.com`)
   - **Shared Secret** — found in `/etc/bigbluebutton/bbb-web.properties` (`securitySalt`) or by running `bbb-conf --secret`
3. Cal.com will validate your credentials against the server before saving.
4. Add BigBlueButton as the location on any event type — a unique room is created automatically for each booking.

## Public Demo Server

To try BigBlueButton without your own server, use [https://demo.bigbluebutton.org](https://demo.bigbluebutton.org). The shared secret is available at that URL.

## Self-Hosting

Follow the [official installation guide](https://docs.bigbluebutton.org/administration/install) to deploy BigBlueButton on Ubuntu 22.04.

## Links

- [BigBlueButton website](https://bigbluebutton.org)
- [GitHub repository](https://github.com/bigbluebutton/bigbluebutton)
- [API documentation](https://docs.bigbluebutton.org/development/api)
