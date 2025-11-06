<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
</div>

# Zapier Integration – Developer Guide

**Note:** This is a redirect app. End users should connect Cal.com to Zapier directly via the Zapier Integrations page: https://zapier.com/apps/calcom/integrations

The Zapier app in Cal.com now functions as a redirect app that takes users directly to Zapier's integration page. No local setup or OAuth configuration is required.

## How It Works

1. **User clicks "Visit"** → Opens Zapier integrations page
2. **User sets up automation** → Directly on Zapier's platform
3. **No Cal.com credentials needed** → Users authenticate directly with Zapier

## For Developers

This app uses the `link-as-an-app` template and requires no additional configuration beyond the redirect URL.

## Legacy API Endpoints

The following API endpoints are maintained for backward compatibility with existing Zapier integrations:

- `GET /api/integrations/zapier/listBookings` - List user bookings
- `GET /api/integrations/zapier/listOOOEntries` - List out-of-office entries
- `POST /api/integrations/zapier/addSubscription` - Subscribe to webhooks
- `DELETE /api/integrations/zapier/deleteSubscription` - Unsubscribe from webhooks
- `GET /api/integrations/zapier/me` - Get user/team information

**Note:** These endpoints support both API key and OAuth authentication for existing integrations. The endpoints are dynamically routed through `/api/integrations/[...args].ts`.
