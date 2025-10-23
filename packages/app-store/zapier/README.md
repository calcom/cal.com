<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
</div>

# Zapier Integration – Developer Guide

Note: End users should connect Cal.com to Zapier directly via the Zapier Integrations page: https://zapier.com/apps/calcom/integrations
The instructions below are intended for developers working on the Zapier app configuration.

If you run it on localhost, check out the [additional information](https://github.com/calcom/cal.com/blob/main/packages/app-store/zapier/README.md#localhost) below.

1. Create [Zapier Account](https://zapier.com/sign-up?next=https%3A%2F%2Fdeveloper.zapier.com%2F)
2. If not redirected to developer account, go to: [Zapier Developer Account](https://developer.zapier.com)
3. Click **Start a Zapier Integration**
4. Create Integration
   - Name: Cal.com
   - Description: [Cal.com](https://cal.com) is a scheduling infrastructure for absolutely everyone.
   - Intended Audience: Private
   - Role: choose whatever is appropriate
   - Category: Calendar

## Authentication

1. Go to Authentication, choose **OAuth v2** and click save
2. Configure OAuth settings:
   - Authorization URL: `<baseUrl>`/api/auth/oauth/authorize
   - Access Token URL: `<baseUrl>`/api/auth/oauth/token
   - Client ID: Your Cal.com OAuth client ID
   - Client Secret: Your Cal.com OAuth client secret
   - Scope: `read:bookings write:bookings`
3. Configure a Test
   - Test: GET `<baseUrl>`/api/integrations/zapier/listBookings
   - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
4. Test your authentication —> Users will connect their Cal.com account directly through OAuth when setting up Zaps.

## Triggers

Booking created, Booking rescheduled, Booking cancelled, Meeting ended, Out Of Office Created

### Booking created

1. Settings
   - Key: booking_created
   - Name: Booking created
   - Noun: Booking
   - Description: Triggers when a new booking is created
2. API Configuration (OAuth token is set automatically, leave it like it is):
   - Trigger Type: REST Hook
   - Subscribe: POST `<baseUrl>`/api/integrations/zapier/addSubscription
     - Request Body
       - subscriberUrl: {{bundle.targetUrl}}
       - triggerEvent: BOOKING_CREATED
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
   - Unsubscribe: DELETE `<baseUrl>`/api/integrations/zapier/deleteSubscription
     - URL Params
       - id: {{bundle.subscribeData.id}}
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
   - PerformList: GET `<baseUrl>`/api/integrations/zapier/listBookings
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
3. Test your API request

Create the other triggers (booking rescheduled, booking cancelled and meeting ended) exactly like this one, just use the appropriate naming (e.g. booking_rescheduled instead of booking_created)

### Out Of Office Created

1. Settings
   - Key: ooo_created
   - Name: Out Of Office Created
   - Noun: OOO Entry
   - Description: Triggers when a new Out Of Office entry is created.
2. API Configuration (OAuth token is set automatically, leave it like it is):
   - Trigger Type: REST Hook
   - Subscribe: POST `<baseUrl>`/api/integrations/zapier/addSubscription
     - Request Body
       - subscriberUrl: {{bundle.targetUrl}}
       - triggerEvent: OOO_CREATED
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
   - Unsubscribe: DELETE `<baseUrl>`/api/integrations/zapier/deleteSubscription
     - URL Params
       - id: {{bundle.subscribeData.id}}
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
   - PerformList: GET `<baseUrl>`/api/integrations/zapier/listOOOEntries
     - Headers: `Authorization: Bearer {{bundle.authData.access_token}}`
3. Test your API request
4. Note: When creating the ZAP you need to remember that data is stored in the { payload: { oooEntry: { ... } } }

### Set ZAPIER_INVITE_LINK

The invite link can be found under Manage → Sharing.

## Localhost

Localhost urls can not be used as the base URL for api endpoints

Possible solution: using [https://ngrok.com/](https://ngrok.com/)

1. Create Account
2. [Download](https://ngrok.com/download) ngrok and start a tunnel to your running localhost
   - Use forwarding url as your baseUrl for the URL endpoints
