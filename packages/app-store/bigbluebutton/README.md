# BigBlueButton Integration

This app integrates [BigBlueButton](https://bigbluebutton.org/) with Cal.com for video conferencing.

## About BigBlueButton

BigBlueButton is an open source web conferencing system designed for online learning. It supports:

- Real-time sharing of audio and video
- Presentation slides
- Screen sharing
- Chat
- Whiteboard
- Breakout rooms
- Polls and quizzes

## Setup

### Prerequisites

You need access to a BigBlueButton server. You can either:

1. Use a hosted BigBlueButton service
2. [Self-host your own BigBlueButton server](https://docs.bigbluebutton.org/administration/install/)

### Configuration

1. Install the BigBlueButton app from the Cal.com App Store
2. Configure the following settings in `/settings/admin/apps`:
   - **BigBlueButton URL**: Your BBB server URL (e.g., `https://bbb.example.com/bigbluebutton/`)
   - **BigBlueButton Secret**: Your BBB shared secret (found in `/etc/bigbluebutton/bbb-web.properties`)

To get your BigBlueButton secret on a self-hosted server:

```bash
bbb-conf --secret
```

## API Documentation

- [BigBlueButton API Documentation](https://docs.bigbluebutton.org/dev/api.html)
- [API Calls: create, join, end](https://docs.bigbluebutton.org/dev/api.html#create)

## Usage

Once configured, you can select "BigBlueButton" as your video conferencing location when creating an event type in Cal.com.
