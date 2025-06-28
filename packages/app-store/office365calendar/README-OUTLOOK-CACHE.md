# Outlook Calendar Cache Implementation

## Overview

This implementation adds calendar caching for Microsoft Outlook/Office 365 calendars, improving performance by reducing API calls to Microsoft Graph. The implementation follows the pattern established by the Google Calendar caching system and consists of the following components:

1. Enhanced `Office365CalendarService` with caching capabilities
2. New `MicrosoftGraphSubscriptionService` for handling Change Notifications
3. Webhook endpoint for receiving real-time change notifications from Microsoft Graph

## Features

- **Cache Busy Times**: Calendar availability data is cached in the database, reducing API calls for frequently accessed time slots.
- **Real-time Updates**: Microsoft Graph Change Notifications are used to invalidate cache when calendar events change.
- **Subscription Management**: Automatic creation, renewal, and deletion of Microsoft Graph subscriptions.
- **Error Handling**: Robust error handling for subscription and webhook failures.

## Implementation Details

### Calendar Caching

The `Office365CalendarService` has been enhanced to use the existing `CalendarCache` infrastructure to store and retrieve availability data. When a request for calendar availability is made, the service:

1. First checks if the data is available in the cache
2. If cached data is available, returns it immediately
3. If no cached data is found, fetches from Microsoft Graph API
4. Stores the fetched data in the cache for future use

### Microsoft Graph Subscriptions

The `MicrosoftGraphSubscriptionService` handles:

1. Creating subscriptions to calendar changes
2. Renewing subscriptions before they expire (Microsoft Graph subscriptions have a maximum lifetime of 3 days)
3. Deleting subscriptions when they are no longer needed
4. Storing subscription metadata in the database

### Webhook Endpoint

A new API route (`/api/integrations/office365calendar/webhook`) handles notifications from Microsoft Graph when calendar events change. This endpoint:

1. Validates incoming notification requests
2. Processes notifications and updates the cache
3. Responds promptly to Microsoft's validation requests

### Database Schema

The existing `SelectedCalendar` model has been extended with fields for Microsoft Graph subscriptions:

```prisma
model SelectedCalendar {
  // ... existing fields
  
  // Microsoft Graph subscription fields
  msGraphSubscriptionId    String?
  msGraphChangeType        String?
  msGraphResourceUrl       String?
  msGraphExpirationDateTime String?
  msGraphClientState       String?
  msGraphLifecycleNotificationUrl String?
  
  // ... other fields
}
```

## Usage

The implementation is designed to be mostly transparent to users. The caching system will automatically:

1. Cache calendar availability when it's first requested
2. Set up change notifications to keep the cache fresh
3. Refresh the cache when changes are detected

## Benefits

- **Reduced API Calls**: Minimizes calls to Microsoft Graph API, avoiding rate limits
- **Improved Performance**: Faster response times for availability checks
- **Scalability**: Better handling of team events with multiple calendars
- **Reliability**: More consistent performance even with many connected calendars

## Technical Notes

- Microsoft Graph subscriptions have a maximum lifetime of 3 days (4230 minutes)
- The webhook requires a publicly accessible URL, which is handled by Cal.com's infrastructure
- Subscription renewal is handled automatically if calendar is still being actively used

## Testing

Unit tests have been added to verify the caching functionality, ensuring that:

1. The service checks the cache before making API calls
2. Cache hits return the expected data
3. Cache misses trigger API calls and update the cache
4. Webhooks correctly process notifications