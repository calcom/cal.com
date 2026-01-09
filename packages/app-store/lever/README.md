# Lever Integration for Cal.com

This integration connects Cal.com directly with Lever ATS, enabling automatic candidate creation and activity logging when bookings are made.

## Features

- Automatically create or find opportunities in Lever based on booking attendee email
- Log meeting notes to the opportunity's profile

## Installation

1. Create an OAuth application in your Lever account (Settings > Integrations & API > API credentials > OAuth)
2. Set the callback URL to: `<your-cal-url>/api/integrations/lever/callback`
3. Select required scopes: `opportunities:write:admin`, `notes:write:admin`, `offline_access`
4. Copy the Client ID and Client Secret
5. Configure the integration in Cal.com admin settings at `<baseUrl>/settings/admin/apps/lever`

## Configuration

Configure through the Cal.com admin panel:

- `client_id`: Your Lever OAuth Client ID
- `client_secret`: Your Lever OAuth Client Secret

## Usage

Once installed and configured, the integration will automatically:

1. When a booking is created: Find or create an opportunity and log a note with meeting details

## API Documentation

- [Lever API Documentation](https://hire.lever.co/developer/documentation)
- [Lever OAuth Setup](https://hire.lever.co/developer/oauth)
