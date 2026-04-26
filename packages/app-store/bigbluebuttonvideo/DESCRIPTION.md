## About BigBlueButton

BigBlueButton is a free, open-source web conferencing system designed for online learning. It includes features such as real-time sharing of audio, video, slides, chat, and screen, plus webcams, whiteboard, shared notes, breakout rooms, and recording.

## Setup

You need a BigBlueButton server (self-hosted or via a provider). Once you have your server URL and shared secret:

1. Install the app
2. Go to **Settings → Apps → BigBlueButton**
3. Enter your BigBlueButton server URL (e.g., `https://bbb.example.com`)
4. Enter your shared secret (found in `/etc/bigbluebutton/bbb-web.properties` or via `bbb-conf --secret`)

## Using BigBlueButton

After installing, you can select BigBlueButton as the location for your events. Cal.diy will automatically create a meeting room and generate join links for you and your attendees.

## Resources

- [BigBlueButton API Documentation](https://docs.bigbluebutton.org/development/api)
- [Self-hosting Guide](https://docs.bigbluebutton.org/administration/install)
- [Hosted providers](https://bigbluebutton.org/commercial-support/)
