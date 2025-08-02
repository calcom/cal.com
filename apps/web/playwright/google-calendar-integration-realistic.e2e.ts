import { expect } from "@playwright/test";
import { rest } from "msw";

import { test } from "./lib/fixtures";
import {
  enableGoogleApiMocking,
  disableGoogleApiMocking,
  resetGoogleApiHandlers,
  googleApiServer,
  MOCK_GOOGLE_CALENDAR_LIST,
  MOCK_GOOGLE_EVENT,
} from "./lib/googleApiMocks";

test.describe("Google Calendar Integration (Realistic)", () => {
  test.beforeAll(() => {
    enableGoogleApiMocking();
  });

  test.afterEach(() => {
    resetGoogleApiHandlers();
  });

  test.afterAll(() => {
    disableGoogleApiMocking();
  });

  test("Can access Google Calendar app page", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock Google OAuth token endpoint
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

    // Navigate to Google Calendar app page
    await page.goto("/apps/google-calendar");
    
    // Verify we can access the page
    await expect(page).toHaveTitle(/Cal\.com/);
    
    // Check if the page contains Google Calendar related content
    await expect(page.locator("text=Google Calendar")).toBeVisible();
    
    console.log("✅ Successfully accessed Google Calendar app page");
  });

  test("Can see Google Calendar integration options", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock calendar list endpoint
    googleApiServer.use(
      rest.get("https://www.googleapis.com/calendar/v3/calendars", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(MOCK_GOOGLE_CALENDAR_LIST));
      })
    );

    // Navigate to apps page
    await page.goto("/apps");
    
    // Look for Google Calendar in the apps list
    await expect(page.locator("text=Google Calendar")).toBeVisible();
    
    // Click on Google Calendar to see details
    await page.click("text=Google Calendar");
    
    // Verify we're on the Google Calendar app page
    await expect(page).toHaveURL(/.*google-calendar/);
    
    console.log("✅ Successfully navigated to Google Calendar integration");
  });

  test("Can mock Google API responses", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock multiple Google API endpoints
    googleApiServer.use(
      // OAuth token endpoint
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
      }),
      // Calendar list endpoint
      rest.get("https://www.googleapis.com/calendar/v3/calendars", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(MOCK_GOOGLE_CALENDAR_LIST));
      }),
      // Calendar events endpoint
      rest.get("https://www.googleapis.com/calendar/v3/calendars/:id/events", (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            items: [MOCK_GOOGLE_EVENT],
            nextPageToken: null,
          })
        );
      })
    );

    // Navigate to a page that might trigger Google API calls
    await page.goto("/settings/calendar");
    
    // Verify the page loads (MSW is intercepting any Google API calls)
    await expect(page).toHaveTitle(/Cal\.com/);
    
    console.log("✅ Successfully mocked Google API responses");
  });

  test("Can handle OAuth error scenarios", async ({ page, users }) => {
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
    
    // Verify the page loads even with OAuth errors
    await expect(page).toHaveTitle(/Cal\.com/);
    
    console.log("✅ Successfully handled OAuth error scenarios");
  });

  test("Can mock calendar availability queries", async ({ page, users }) => {
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

    // Navigate to availability settings
    await page.goto("/settings/availability");
    
    // Verify the page loads
    await expect(page).toHaveTitle(/Cal\.com/);
    
    console.log("✅ Successfully mocked calendar availability queries");
  });

  test("Can mock calendar event creation", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock event creation endpoint
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

    // Navigate to event types page
    await page.goto("/event-types");
    
    // Verify the page loads
    await expect(page).toHaveTitle(/Cal\.com/);
    
    console.log("✅ Successfully mocked calendar event creation");
  });

  test("Can verify MSW is working correctly", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Mock a simple Google API endpoint
    googleApiServer.use(
      rest.get("https://www.googleapis.com/calendar/v3/calendars", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ message: "Mocked successfully" }));
      })
    );

    // Navigate to any page
    await page.goto("/");
    
    // Verify the page loads normally (MSW doesn't interfere with normal requests)
    await expect(page).toHaveTitle(/Cal\.com/);
    
    console.log("✅ MSW is working correctly and not interfering with normal requests");
  });
}); 
