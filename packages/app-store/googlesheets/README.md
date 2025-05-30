# Google Sheets App for Cal.com

This app automatically exports booking data to Google Sheets when enabled per event type.

## Features

- **OAuth2 Integration**: Secure authentication with Google Sheets API v4
- **Per-Event Type Configuration**: Enable/disable integration for specific event types
- **Automatic Data Export**: Handles all supported webhook events
- **One Row Per Booking**: Updates existing rows instead of creating duplicates
- **Auto-Generated Headers**: Column headers created automatically
- **Business Data Only**: Exports relevant data while excluding technical fields

## Setup

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
GOOGLE_SHEETS_CLIENT_ID=your_google_oauth_client_id
GOOGLE_SHEETS_CLIENT_SECRET=your_google_oauth_client_secret
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/integrations/googlesheets/callback`
5. Copy the Client ID and Client Secret to your environment variables

### Usage

1. Install the app from the Cal.com app store
2. Authenticate with your Google account
3. For each event type:
   - Go to event type settings
   - Enable Google Sheets integration
   - Enter your Google Sheets URL
   - Test the connection

## Supported Webhook Events

- BOOKING_CREATED
- BOOKING_CANCELLED
- BOOKING_RESCHEDULED
- BOOKING_PAID
- BOOKING_PAYMENT_INITIATED
- BOOKING_REQUESTED
- BOOKING_REJECTED
- BOOKING_NO_SHOW_UPDATED
- MEETING_STARTED
- MEETING_ENDED
- INSTANT_MEETING
- RECORDING_READY
- RECORDING_TRANSCRIPTION_GENERATED

## Data Exported

The following fields are exported to your spreadsheet:

- Booking ID, Event Type, Title
- Start Time, End Time, Duration
- Organizer and Attendee Information
- Location, Description
- Custom Inputs and Responses
- Payment Information
- Team Information (for team events)
- Recurring Event Details
- Seats Information

## Technical Details

- Uses Google Sheets API v4
- Follows Cal.com OAuth patterns
- Implements rate limiting and error handling
- Maintains data consistency with booking updates
- Excludes sensitive technical fields (UIDs, API credentials, etc.)

## Development

The app follows the standard Cal.com app store structure:

```
packages/app-store/googlesheets/
├── api/
│   ├── add.ts          # OAuth initiation
│   ├── callback.ts     # OAuth callback
│   ├── test.ts         # Connection testing
│   └── webhook.ts      # Webhook handler
├── components/
│   └── EventTypeAppSettingsInterface.tsx
├── lib/
│   ├── GoogleSheetsService.ts
│   └── getGoogleSheetsAppKeys.ts
├── static/
│   └── icon.svg
├── _metadata.ts
├── config.json
├── package.json
└── zod.ts
```