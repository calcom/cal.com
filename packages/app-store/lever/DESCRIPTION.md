---
title: Lever
description: Lever is a leading Talent Acquisition Suite that makes it easy for talent teams to reach their hiring goals and to connect companies with top talent.
---

## How to use Lever with Cal.com

1. Go to [Lever Developer Portal](https://hire.lever.co/developer/oauth) and create an OAuth application
2. Set the callback URL to: `{YOUR_CAL_URL}/api/integrations/lever/callback`
3. Copy the Client ID and Client Secret
4. Go to Cal.com Settings > Apps > Lever
5. Install and enter your credentials
6. Grant the required permissions when redirected to Lever

## Features

- Automatically create candidates in Lever when meetings are booked
- Keep candidate information synchronized
- Track recruiting activities linked to Cal.com meetings

## Required Scopes

The integration requires the following OAuth scopes:
- `offline_access` - To refresh tokens
- `candidates:read:admin` - To search for existing candidates
- `candidates:write:admin` - To create and update candidates
- `opportunities:read:admin` - To view opportunities
- `opportunities:write:admin` - To create opportunities

## Support

For help with this integration, visit [Cal.com Support](https://cal.com/support) or [Lever Help Center](https://help.lever.co).
