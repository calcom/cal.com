# Google API Mocking for Cal.com

This document describes the comprehensive Google API mocking solution for Cal.com, which combines **MSW (Mock Service Worker)** for frontend calls and **library-level mocking** for backend calls.

## 🎯 Overview

### Problem

- Google APIs have rate limits that can slow down development
- Real API calls can be expensive and unreliable for testing
- Need consistent test environments
- Backend and frontend calls need different mocking strategies

### Solution

**Hybrid Approach:**

- **MSW** for frontend/browser API calls
- **Library-level mocking** for backend/Node.js API calls
- **Environment-based switching** for development vs production
- **Unified mock data** across both approaches

## 📁 File Structure

```
web/
├── playwright/
│   ├── lib/
│   │   └── googleApiMocks.ts          # MSW handlers for frontend
│   ├── google-calendar-integration.e2e.ts  # Example tests
│   └── README-Google-API-Mocking.md   # This file
├── lib/
│   └── googleApiMockConfig.ts         # Configuration & helpers
└── packages/app-store/googlecalendar/lib/__mocks__/
    ├── googleapis.ts                  # Existing test mocks
    └── googleapis-dev.ts              # Enhanced dev mocks
```

## 🚀 Quick Start

### 1. Enable Mocking

Set environment variable to enable Google API mocking:

```bash
# Enable for development
export GOOGLE_API_MOCK=true

# Or for specific test runs
GOOGLE_API_MOCK=true yarn playwright test
```

### 2. Run Tests

```bash
# Run Google Calendar integration tests
yarn playwright test google-calendar-integration.e2e.ts

# Run all tests with mocking enabled
GOOGLE_API_MOCK=true yarn playwright test
```

### 3. Use in Development

```typescript
import { setupGoogleApiMocking } from "@calcom/lib/googleApiMockConfig";

// Setup mocking in your app
await setupGoogleApiMocking();
```

## 🔧 Configuration

### Environment Variables

| Variable          | Description                                       | Default |
| ----------------- | ------------------------------------------------- | ------- |
| `GOOGLE_API_MOCK` | Enable Google API mocking                         | `false` |
| `NODE_ENV`        | Automatically enables mocking in test environment | -       |

### Mock Data

All mock data is centralized in `web/lib/googleApiMockConfig.ts`:

```typescript
export const MOCK_GOOGLE_DATA = {
  calendarList: {
    /* ... */
  },
  calendar: {
    /* ... */
  },
  event: {
    /* ... */
  },
  freeBusy: {
    /* ... */
  },
  oauthToken: {
    /* ... */
  },
  userInfo: {
    /* ... */
  },
};
```

## 📝 Usage Examples

### Basic Test Setup

```typescript
import { test } from "./lib/fixtures";
import {
  enableGoogleApiMocking,
  disableGoogleApiMocking,
  resetGoogleApiHandlers,
} from "./lib/googleApiMocks";

test.describe("Google Calendar", () => {
  test.beforeAll(() => {
    enableGoogleApiMocking();
  });

  test.afterEach(() => {
    resetGoogleApiHandlers();
  });

  test.afterAll(() => {
    disableGoogleApiMocking();
  });

  test("can add integration", async ({ page, users }) => {
    // Your test code here
  });
});
```

### Custom Mock Responses

```typescript
import { rest } from "msw";

import { googleApiServer } from "./lib/googleApiMocks";

test("custom calendar events", async ({ page }) => {
  // Mock specific calendar events
  googleApiServer.use(
    rest.get("https://www.googleapis.com/calendar/v3/calendars/:id/events", (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          items: [
            {
              id: "custom-event",
              summary: "Custom Event",
              start: { dateTime: "2024-01-15T10:00:00Z" },
              end: { dateTime: "2024-01-15T11:00:00Z" },
            },
          ],
        })
      );
    })
  );

  // Your test code here
});
```

### Pre-built Handlers

```typescript
import { createGoogleApiHandlers } from "./lib/googleApiMocks";

test("oauth failure scenario", async ({ page }) => {
  // Use pre-built OAuth failure handler
  googleApiServer.use(...createGoogleApiHandlers.oauthFailure());

  // Your test code here
});

test("busy calendar scenario", async ({ page }) => {
  // Use pre-built busy calendar handler
  googleApiServer.use(...createGoogleApiHandlers.busyCalendar());

  // Your test code here
});
```

## 🔄 API Coverage

### Frontend (MSW) Coverage ✅

| API              | Endpoint                | Status |
| ---------------- | ----------------------- | ------ |
| Google Calendar  | `/calendar/v3/*`        | ✅     |
| Google OAuth2    | `/oauth2/v4/token`      | ✅     |
| Google User Info | `/oauth2/v2/userinfo`   | ✅     |
| Google Admin     | `/admin/directory/v1/*` | ✅     |
| Google Drive     | `/drive/v3/*`           | ✅     |

### Backend (Library) Coverage ✅

| Service       | Methods                                          | Status |
| ------------- | ------------------------------------------------ | ------ |
| Calendar API  | `list`, `insert`, `update`, `delete`, `watch`    | ✅     |
| OAuth2 Client | `setCredentials`, `refreshToken`, `getTokenInfo` | ✅     |
| JWT Client    | `authorize`                                      | ✅     |
| Admin API     | `users.list`                                     | ✅     |

## 🧪 Test Scenarios

### 1. OAuth Flow Testing

```typescript
test("OAuth flow", async ({ page }) => {
  // Mock OAuth authorization
  await page.route("https://accounts.google.com/o/oauth2/v2/auth?**", (route) => {
    const url = new URL(route.request().url());
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");

    return route.fulfill({
      status: 302,
      headers: {
        location: `${redirectUri}?code=mock-auth-code&state=${state}`,
      },
    });
  });

  // Mock token exchange
  googleApiServer.use(
    rest.post("https://www.googleapis.com/oauth2/v4/token", (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(MOCK_GOOGLE_DATA.oauthToken));
    })
  );

  // Navigate and test
  await page.goto("/apps/google-calendar");
  await page.click('[data-testid="install-app-button"]');
});
```

### 2. Calendar Event Testing

```typescript
test("create calendar event", async ({ page }) => {
  // Mock event creation
  googleApiServer.use(
    rest.post("https://www.googleapis.com/calendar/v3/calendars/:id/events", (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          ...MOCK_GOOGLE_DATA.event,
          id: `mock-event-${Date.now()}`,
        })
      );
    })
  );

  // Test event creation flow
  await page.goto("/event-types");
  // ... test steps
});
```

### 3. Error Handling Testing

```typescript
test("OAuth error handling", async ({ page }) => {
  // Mock OAuth failure
  googleApiServer.use(
    rest.post("https://www.googleapis.com/oauth2/v4/token", (req, res, ctx) => {
      return res(
        ctx.status(400),
        ctx.json({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        })
      );
    })
  );

  // Test error handling
  await page.goto("/apps/google-calendar");
  // ... verify error message
});
```

## 🔍 Debugging

### Enable Request Logging

```typescript
// In your test setup
googleApiServer.listen({
  onUnhandledRequest: "warn", // Log unmocked requests
});
```

### Check Mock Status

```typescript
import { isGoogleApiMockingEnabled } from "@calcom/lib/googleApiMockConfig";

console.log("Mocking enabled:", isGoogleApiMockingEnabled());
```

### Verify Mock Data

```typescript
import { MOCK_GOOGLE_DATA } from "@calcom/lib/googleApiMockConfig";

console.log("Mock calendar:", MOCK_GOOGLE_DATA.calendar);
```

## 🚨 Troubleshooting

### Common Issues

1. **MSW not intercepting requests**

   - Ensure MSW is enabled before tests start
   - Check that requests match the mocked endpoints exactly

2. **Backend calls not mocked**

   - Library-level mocks only work in test environment
   - Ensure `NODE_ENV=test` or `GOOGLE_API_MOCK=true`

3. **Mock data inconsistencies**
   - Use centralized mock data from `googleApiMockConfig.ts`
   - Ensure MSW and library mocks use same data

### Debug Commands

```bash
# Run with verbose logging
DEBUG=msw:* yarn playwright test

# Check environment
echo $GOOGLE_API_MOCK
echo $NODE_ENV

# Run specific test with mocking
GOOGLE_API_MOCK=true yarn playwright test google-calendar-integration.e2e.ts
```

## 📚 Best Practices

1. **Use centralized mock data** - Import from `googleApiMockConfig.ts`
2. **Reset handlers between tests** - Use `resetGoogleApiHandlers()`
3. **Test error scenarios** - Mock API failures and errors
4. **Use pre-built handlers** - Leverage `createGoogleApiHandlers`
5. **Environment-based switching** - Use `GOOGLE_API_MOCK` variable

## 🔄 Migration Guide

### From Existing Tests

1. **Import the new mocks:**

   ```typescript
   import { enableGoogleApiMocking } from "./lib/googleApiMocks";
   ```

2. **Replace existing mock setup:**

   ```typescript
   // Old
   vi.mock("@googleapis/calendar");

   // New
   enableGoogleApiMocking();
   ```

3. **Use unified mock data:**

   ```typescript
   // Old
   const mockEvent = { /* ... */ };

   // New
   import { MOCK_GOOGLE_DATA } from "@calcom/lib/googleApiMockConfig";
   const mockEvent = MOCK_GOOGLE_DATA.event;
   ```

## 🤝 Contributing

When adding new Google API endpoints:

1. **Add MSW handler** in `googleApiMocks.ts`
2. **Add library mock** in `googleapis-dev.ts`
3. **Add mock data** in `googleApiMockConfig.ts`
4. **Write tests** using the new mocks
5. **Update documentation** in this README

## 📄 License

This mocking solution is part of Cal.com and follows the same license terms.
