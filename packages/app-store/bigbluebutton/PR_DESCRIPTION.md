# feat: Add BigBlueButton Integration

Closes #1985

## Description

This PR adds BigBlueButton integration to Cal.com, allowing users to automatically create BigBlueButton meetings when scheduling events.

## Features

- ✅ Create BigBlueButton meetings automatically when booking
- ✅ Generate unique meeting IDs and passwords
- ✅ Provide host and attendee join URLs
- ✅ Support meeting duration configuration
- ✅ Server connection health check
- ✅ Full test coverage

## Implementation Details

### New Files

```
packages/app-store/bigbluebutton/
├── index.ts                    # App metadata
├── config.json                 # App configuration
├── DESCRIPTION.md              # User-facing documentation
├── package.json                # Package dependencies
├── api/
│   └── index.ts               # Connection check API
├── lib/
│   └── VideoApiAdapter.ts     # BBB API integration
├── test/
│   └── VideoApiAdapter.test.ts # Unit tests
└── static/
    └── icon.svg               # App icon (placeholder)
```

### Key Components

1. **VideoApiAdapter** - Implements Cal.com's VideoApiAdapter interface
   - `createMeeting()` - Creates BBB meeting via API
   - `updateMeeting()` - Creates new meeting (BBB doesn't support updates)
   - `deleteMeeting()` - Handles meeting cleanup
   - `checkServerStatus()` - Verifies BBB server connectivity

2. **API Security** - SHA1 checksum generation for BBB API calls

3. **Error Handling** - XML response parsing with friendly error messages

## Setup Instructions

1. Install the BigBlueButton app from the Cal.com app store
2. Configure your BBB server URL and shared secret:
   - URL: `https://your-bbb-server.com`
   - Secret: From `bbb-conf --secret` on your BBB server
3. Select BigBlueButton as the location when creating event types

## Testing

```bash
# Run unit tests
yarn test packages/app-store/bigbluebutton

# Test BBB connection (requires credentials)
curl /api/integrations/bigbluebutton/check?credentialId=YOUR_ID
```

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Code is commented, particularly in hard-to-understand areas
- [x] Corresponding documentation changes made
- [x] Tests added that prove the fix is effective or feature works
- [x] New and existing unit tests pass locally

## Screenshots

N/A - Backend integration

## Related Issues

Fixes #1985

/claim $50
