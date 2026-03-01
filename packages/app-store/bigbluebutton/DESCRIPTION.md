# BigBlueButton

BigBlueButton is a free, open-source web conferencing platform designed for online education and meetings. It features:

- **Breakout rooms** — split participants into smaller groups
- **Shared notes** — collaborative note-taking during meetings
- **Polling** — real-time audience engagement
- **Recording** — capture and share meeting recordings
- **Screen sharing** — present your screen to all participants
- **Whiteboard** — interactive drawing and annotation

## How to connect

You'll need access to a self-hosted BigBlueButton server (version 2.0+). You can find your **API URL** and **Shared Secret** in your BigBlueButton server's `bigbluebutton.properties` file, or by running:

```bash
sudo bbb-conf --secret
```

The output will show your server URL and shared secret.

## Learn more

- [BigBlueButton website](https://bigbluebutton.org/)
- [BigBlueButton API documentation](https://docs.bigbluebutton.org/development/api)
- [Self-hosting BigBlueButton](https://docs.bigbluebutton.org/administration/install)
