---
items:
  - icon.svg
---

BigBlueButton is an open-source video conferencing system designed for education and business. Host unlimited meetings on your own server with features like screen sharing, whiteboard, breakout rooms, and recording capabilities.

## Features

- 🎥 HD video conferencing
- 📱 Works on desktop and mobile
- 🎯 Built for education and business
- 🔒 Self-hosted for privacy and control
- 📊 Screen sharing and presentation tools
- ✏️ Interactive whiteboard
- 👥 Breakout rooms for small groups
- 📹 Optional meeting recording

## Setup

1. **BigBlueButton Server**: You need access to a BigBlueButton server. You can:
   - Set up your own server following the [BigBlueButton installation guide](https://docs.bigbluebutton.org/install/install-overview)
   - Use a hosted BigBlueButton provider
   - Use BigBlueButton's demo server for testing (not recommended for production)

2. **Server URL**: Enter your BigBlueButton server URL (e.g., `https://your-bbb-server.com`)

3. **Shared Secret**: Enter your BigBlueButton shared secret (found in `/opt/bbb/conf/salt` on your server)

## How it works

When someone books a meeting with you:

1. A unique BigBlueButton meeting room is automatically created
2. The meeting host (you) receives a moderator link
3. Meeting attendees receive participant links
4. The meeting room is automatically deleted when the booking is cancelled

## Security

- All communications are encrypted end-to-end
- Meeting rooms are created on-demand and deleted after use
- Attendee access is controlled by unique passwords
- Self-hosted deployment keeps your data private