# Google Sheets Integration

Automatically export your Cal.com booking data to Google Sheets when enabled per event type.

## Features

- **OAuth Integration**: Secure authentication with Google Sheets API v4
- **Per-Event Type Configuration**: Enable/disable the integration for specific event types
- **Automatic Data Export**: Exports booking data for all supported webhook events
- **One Row Per Booking**: Updates existing rows rather than creating duplicates
- **Auto-Generated Headers**: Column headers are created automatically on first use
- **Business Data Only**: Exports relevant booking information while excluding technical fields

## Supported Events

The integration handles all core booking events:
- Booking Created
- Booking Cancelled
- Booking Rescheduled
- Booking Paid
- Payment Initiated
- Booking Requested
- Booking Rejected
- No Show Updated
- Meeting Started
- Meeting Ended
- Instant Meeting
- Recording Ready
- Recording Transcription Generated

## Setup

1. Install the Google Sheets app from the Cal.com app store
2. Authenticate with your Google account
3. For each event type where you want to export data:
   - Go to the event type settings
   - Enable the Google Sheets integration
   - Provide the URL of your Google Sheets document
   - Test the connection to ensure it works

## Data Exported

The following booking information is exported to your spreadsheet:
- Booking details (ID, title, start/end times, duration)
- Organizer and attendee information
- Event type and location details
- Custom inputs and responses
- Payment information (if applicable)
- Team information (for team events)
- Recurring event details
- Seats information (for seated events)

## Requirements

- Google account with access to Google Sheets
- Edit permissions on the target spreadsheet
- Cal.com event types with the integration enabled