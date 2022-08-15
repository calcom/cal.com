<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
</div>

# Setting up Zapier Integration

If you run it on localhost, check out the [additional information](https://github.com/CarinaWolli/cal.com/edit/feat/zapier-app/packages/app-store/zapier/README.md#localhost) below.

1. Create [Zapier Account](https://zapier.com/sign-up?next=https%3A%2F%2Fdeveloper.zapier.com%2F)
2. If not redirected to developer account, go to: [Zapier Developer Account](https://developer.zapier.com)
3. Click **Start a Zapier Integration**
4. Create Integration
   - Name: Cal.com
   - Description: Cal.com is a scheduling infrastructure for absolutely everyone.
   - Intended Audience: Private
   - Role: choose whatever is appropriate
   - Category: Calendar

## Authentication

1. Go to Authentication, choose Api key and click save
2. Click Add Fields
   - Key: apiKey
   - Check the box ‘is this field required?’
3. Configure a Test
   - Test: GET `<baseUrl>`/api/integrations/zapier/listBookings
   - URL Params
     - apiKey: {{bundle.authData.apiKey}}
4. Test your authentication —> First you have to install Zapier in the Cal.com App Store and generate an API key, use this API key to test your authentication (only zapier Api key works)

## Triggers

Booking created, Booking rescheduled, Booking cancelled, Meeting ended

### Booking created

1. Settings
   - Key: booking_created
   - Name: Booking created
   - Noun: Booking
   - Description: Triggers when a new booking is created
2. API Configuration (apiKey is set automatically, leave it like it is):
   - Trigger Type: REST Hook
   - Subscribe: POST `<baseUrl>`/api/integrations/zapier/addSubscription
     - Request Body
       - subscriberUrl: {{bundle.targetUrl}}
       - triggerEvent: BOOKING_CREATED
   - Unsubscribe: DELETE `<baseUrl>`/api/integrations/zapier/deleteSubscription
     - URL Params (in addition to apiKey)
       - id: {{bundle.subscribeData.id}}
   - PerformList: GET `<baseUrl>`/api/integrations/zapier/listBookings
3. Test your API request

Create the other triggers (booking rescheduled, booking cancelled and meeting ended) exactly like this one, just use the appropriate naming (e.g. booking_rescheduled instead of booking_created)

### Set ZAPIER_INVITE_LINK

The invite link can be found under under Manage → Sharing.

## Localhost

Localhost urls can not be used as the base URL for api endpoints

Possible solution: using [https://ngrok.com/](https://ngrok.com/)

1. Create Account
2. [Download](https://ngrok.com/download) gnork and start a tunnel to your running localhost
   - Use forwarding url as your baseUrl for the URL endpoints
