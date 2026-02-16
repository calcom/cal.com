# Lever CRM Integration

## Overview

This integration connects Cal.com with Lever's Applicant Tracking System (ATS) via Lever's native API. When a booking is made through Cal.com, the integration automatically logs the activity as a note on the corresponding Lever opportunity.

## Features

- **OAuth Authentication**: Secure connection to your Lever account
- **Automatic Activity Logging**: Booking details are logged as notes on Lever opportunities
- **Contact Syncing**: Searches for existing opportunities by email or creates new ones
- **Update Support**: Updates notes when bookings are rescheduled
- **Delete Support**: Removes notes when bookings are cancelled

## Setup Instructions

### 1. Create a Lever OAuth Application

1. Log in to your Lever account
2. Navigate to Settings → Integrations → API credentials
3. Click "Create new API credentials"
4. Fill in the application details:
   - **Name**: Cal.com Integration
   - **Redirect URI**: `https://app.cal.com/api/integrations/lever/callback` (adjust for your Cal.com instance)
5. Save and note your **Client ID** and **Client Secret**

### 2. Configure Cal.com

1. Go to Cal.com Admin Settings
2. Navigate to Apps → CRM
3. Find "Lever" and click "Edit"
4. Enter your Lever **Client ID** and **Client Secret**
5. Save the configuration

### 3. Connect Your Lever Account

1. Go to your Cal.com Event Types
2. Select an event type
3. Go to the "Apps" tab
4. Find "Lever" and click "Install"
5. You'll be redirected to Lever to authorize the connection
6. Grant the requested permissions
7. You'll be redirected back to Cal.com

## Required Scopes

The integration requires the following Lever API scopes:

- `opportunities:read:admin` - To search for existing opportunities
- `opportunities:write:admin` - To create new opportunities
- `contact:read:admin` - To read opportunity contact information
- `contact:write:admin` - To manage opportunity contacts
- `notes:read:admin` - To read opportunity notes
- `notes:write:admin` - To create, update, and delete booking notes
- `offline_access` - To maintain the connection without re-authentication

## How It Works

When a booking is created through Cal.com:

1. The integration searches for an existing Lever opportunity with the attendee's email
2. If no opportunity exists, it creates a new one
3. A note is added to the opportunity with the booking details:
   - Meeting title
   - Scheduled date and time
   - Location/meeting link
   - Additional notes from the booking

When a booking is updated or cancelled, the corresponding note in Lever is updated or deleted accordingly.

## Troubleshooting

### Connection Issues

If you're having trouble connecting:

- Verify your Client ID and Client Secret are correct
- Ensure the redirect URI in Lever matches your Cal.com instance URL
- Check that you have admin access to your Lever account

### Notes Not Appearing

If notes aren't being created:

- Verify the integration is enabled on the specific Event Type
- Check that the attendee email exists as an opportunity in Lever
- Review the Cal.com logs for any error messages

## Support

For issues related to:
- **Cal.com integration**: Visit https://github.com/calcom/cal.com/issues
- **Lever API**: Contact Lever support or visit https://hire.lever.co/developer/documentation

## Technical Details

- **API Base**: `https://api.lever.co/v1`
- **OAuth Endpoint**: `https://auth.lever.co`
- **Integration Type**: CRM
- **Pattern**: Based on Cal.com's standard CRM integration pattern
