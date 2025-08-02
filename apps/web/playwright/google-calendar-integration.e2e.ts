import { expect } from "@playwright/test";
import { rest } from "msw";

import { test } from "./lib/fixtures";
import {
  enableGoogleApiMocking,
  disableGoogleApiMocking,
  resetGoogleApiHandlers,
  googleApiServer,
  createGoogleApiHandlers,
  MOCK_GOOGLE_CALENDAR_LIST,
  MOCK_GOOGLE_EVENT,
} from "./lib/googleApiMocks";

// Note: For e2e tests, we rely on MSW for mocking Google APIs
// The library-level mocks are primarily for unit tests

test.describe("Google Calendar Integration", () => {
  // Enable Google API mocking before all tests
  test.beforeAll(() => {
    enableGoogleApiMocking();
  });

  // Reset handlers after each test
  test.afterEach(() => {
    resetGoogleApiHandlers();
  });

  // Disable mocking after all tests
  test.afterAll(() => {
    disableGoogleApiMocking();
  });

  test("Can add Google Calendar integration", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock the OAuth flow
    googleApiServer.use(
      rest.post("https://www.googleapis.com/oauth2/v4/token", (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
            token_type: "Bearer",
            expiry_date: Date.now() + 3600000,
          })
        );
      })
    );

    // Navigate to Google Calendar app
    await page.goto("/apps/google-calendar");
    await page.click('[data-testid="install-app-button"]');

    // Mock the OAuth authorization redirect
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

    // Wait for successful installation
    await page.waitForNavigation({
      url: (url) => url.pathname === "/apps/installed",
    });

    // Verify the integration was added
    await expect(page.locator('[data-testid="google-calendar-integration"]')).toBeVisible();
  });

  test("Can create calendar event", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock calendar list
    googleApiServer.use(
      rest.get("https://www.googleapis.com/calendar/v3/calendars", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(MOCK_GOOGLE_CALENDAR_LIST));
      })
    );

    // Mock event creation
    googleApiServer.use(
      rest.post("https://www.googleapis.com/calendar/v3/calendars/:calendarId/events", (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            ...MOCK_GOOGLE_EVENT,
            id: `mock-event-${Date.now()}`,
          })
        );
      })
    );

    // Navigate to event creation
    await page.goto("/event-types");
    await page.click('[data-testid="create-event-type"]');

    // Fill event details
    await page.fill('[data-testid="event-title"]', "Test Event");
    await page.fill('[data-testid="event-description"]', "Test event description");

    // Select Google Calendar as destination
    await page.click('[data-testid="destination-calendar-select"]');
    await page.click('[data-testid="google-calendar-option"]');

    // Save event
    await page.click('[data-testid="save-event"]');

    // Verify event was created
    await expect(page.locator('[data-testid="event-created-success"]')).toBeVisible();
  });

  test("Can fetch calendar availability", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock free/busy query
    googleApiServer.use(
      rest.post("https://www.googleapis.com/calendar/v3/freeBusy", (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            timeMin: "2024-01-15T00:00:00Z",
            timeMax: "2024-01-16T00:00:00Z",
            calendars: {
              primary: {
                busy: [
                  {
                    start: "2024-01-15T10:00:00Z",
                    end: "2024-01-15T11:00:00Z",
                  },
                ],
              },
            },
          })
        );
      })
    );

    // Navigate to availability page
    await page.goto("/availability");

    // Verify availability is displayed
    await expect(page.locator('[data-testid="availability-calendar"]')).toBeVisible();
  });

  test("Handles OAuth errors gracefully", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

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

    // Navigate to Google Calendar app
    await page.goto("/apps/google-calendar");
    await page.click('[data-testid="install-app-button"]');

    // Mock the OAuth authorization redirect
    await page.route("https://accounts.google.com/o/oauth2/v2/auth?**", (route) => {
      const url = new URL(route.request().url());
      const redirectUri = url.searchParams.get("redirect_uri");
      const state = url.searchParams.get("state");

      return route.fulfill({
        status: 302,
        headers: {
          location: `${redirectUri}?code=invalid-code&state=${state}`,
        },
      });
    });

    // Verify error handling
    await expect(page.locator('[data-testid="oauth-error"]')).toBeVisible();
  });

  test("Can disconnect Google Calendar integration", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock successful OAuth flow first
    googleApiServer.use(
      rest.post("https://www.googleapis.com/oauth2/v4/token", (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            scope: "https://www.googleapis.com/auth/calendar",
            token_type: "Bearer",
            expiry_date: Date.now() + 3600000,
          })
        );
      })
    );

    // Add the integration first
    await page.goto("/apps/google-calendar");
    await page.click('[data-testid="install-app-button"]');

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

    await page.waitForNavigation({
      url: (url) => url.pathname === "/apps/installed",
    });

    // Now disconnect
    await page.locator('[data-testid="google-calendar-disconnect-button"]').click();
    await page.locator('[data-testid="confirm-disconnect"]').click();

    // Verify disconnection
    await expect(page.locator('[data-testid="integration-disconnected"]')).toBeVisible();
  });

  test("Can handle busy calendar scenario", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Use the busy calendar handler
    googleApiServer.use(...createGoogleApiHandlers.busyCalendar());

    // Navigate to booking page
    await page.goto("/book/test-user/test-event");

    // Verify busy times are handled
    await expect(page.locator('[data-testid="busy-time-slots"]')).toBeVisible();
  });

  test("Can handle calendar with specific events", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    const customEvents = [
      {
        id: "custom-event-1",
        summary: "Custom Event 1",
        start: { dateTime: "2024-01-15T09:00:00-05:00" },
        end: { dateTime: "2024-01-15T10:00:00-05:00" },
      },
      {
        id: "custom-event-2",
        summary: "Custom Event 2",
        start: { dateTime: "2024-01-15T14:00:00-05:00" },
        end: { dateTime: "2024-01-15T15:00:00-05:00" },
      },
    ];

    // Use custom events handler
    googleApiServer.use(...createGoogleApiHandlers.calendarWithEvents(customEvents));

    // Navigate to calendar view
    await page.goto("/availability");

    // Verify custom events are displayed
    await expect(page.locator('[data-testid="custom-event-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-event-2"]')).toBeVisible();
  });
}); 
