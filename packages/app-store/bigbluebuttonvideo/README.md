# BigBlueButton

## What is BigBlueButton?

[BigBlueButton](https://bigbluebutton.org/) is a free, open-source web conferencing system designed for online learning. It supports audio, video, slides, whiteboard, chat, polling, and breakout rooms.

## How to use the BigBlueButton integration

### Prerequisites

You need a running BigBlueButton server (v2.4+). You can:

- [Deploy your own](https://docs.bigbluebutton.org/administration/install)
- Use a hosted provider such as [BigBlueButton.cloud](https://bigbluebutton.cloud/)

### Configuration

1. Navigate to your BigBlueButton admin panel and obtain:
   - **Server URL** — e.g. `https://your-bbb.example.com/bigbluebutton`
   - **API Secret** — found in `/etc/bigbluebutton/bbb-web.properties` as `securitySalt`

2. Go to **Settings → Apps → BigBlueButton** in Cal.com and paste the URL and secret.

3. Select **BigBlueButton** as the conferencing location on any event type.

### How it works

When a meeting is booked Cal.com calls the BigBlueButton `create` API, then generates a join URL that attendees click to enter the room. Meetings end automatically when all participants leave, or can be ended manually via the `end` API.

### API Reference

- [BigBlueButton API docs](https://docs.bigbluebutton.org/development/api/)
