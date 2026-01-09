# BigBlueButton Integration for Cal.com

This integration connects Cal.com with BigBlueButton, an open-source web conferencing system designed for online learning.

## Features

- Automatically create BigBlueButton meetings when bookings are made
- Unique meeting rooms per booking
- Support for self-hosted BigBlueButton servers

## Installation

1. Set up a BigBlueButton server (self-hosted or managed)
2. Get your BigBlueButton server URL and shared secret
3. Configure the integration in Cal.com admin settings at `<baseUrl>/settings/admin/apps/bigbluebutton`

## Configuration

Configure through the Cal.com admin panel:

- `bbbUrl`: Your BigBlueButton server URL (e.g., `https://bbb.example.com`)
- `bbbSecret`: Your BigBlueButton shared secret (found in `/etc/bigbluebutton/bbb-web.properties`)

## Usage

Once installed and configured, the integration will automatically:

1. Create a BigBlueButton meeting room when a booking is confirmed
2. Provide join links for both moderators (organizers) and attendees

## API Documentation

- [BigBlueButton API Reference](https://docs.bigbluebutton.org/development/api/)
- [BigBlueButton Installation](https://docs.bigbluebutton.org/administration/install/)
