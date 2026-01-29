# ZoomInfo Integration

This integration enriches attendee data with ZoomInfo's B2B intelligence for every booking.

## Setup

1. Create a ZoomInfo developer account at https://developers.zoominfo.com/
2. Create an OAuth application in the ZoomInfo Developer Portal
3. Configure the OAuth redirect URI to: `<baseUrl>/api/integrations/zoominfo/callback`
4. Add your ZoomInfo credentials in the Cal.com admin settings:
   - `ZOOMINFO_CLIENT_ID`: Your ZoomInfo OAuth client ID
   - `ZOOMINFO_CLIENT_SECRET`: Your ZoomInfo OAuth client secret

## Features

- Automatic attendee enrichment on booking creation
- Contact information (name, email, phone, job title)
- Company details (name, industry, revenue, employee count)
- Professional context (job function, management level)
- LinkedIn profile URL

## Privacy

Enriched data is only visible to the host of the booking, not to attendees. This ensures that attendees' privacy is respected while providing valuable context to hosts.

## API Documentation

For more information about the ZoomInfo API, visit: https://docs.zoominfo.com/
