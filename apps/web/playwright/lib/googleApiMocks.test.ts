import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rest } from "msw";
import { setupServer } from "msw/node";

import {
  enableGoogleApiMocking,
  disableGoogleApiMocking,
  resetGoogleApiHandlers,
  googleApiServer,
  MOCK_GOOGLE_CALENDAR_LIST,
  MOCK_GOOGLE_EVENT,
  MOCK_GOOGLE_OAUTH_TOKEN,
} from "./googleApiMocks";

const server = setupServer();

describe("Google API Mocking", () => {
  beforeEach(() => {
    enableGoogleApiMocking();
  });

  afterEach(() => {
    resetGoogleApiHandlers();
    disableGoogleApiMocking();
  });

  it("should mock Google Calendar API", async () => {
    // Mock calendar list endpoint
    googleApiServer.use(
      rest.get("https://www.googleapis.com/calendar/v3/calendars", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(MOCK_GOOGLE_CALENDAR_LIST));
      })
    );

    // Simulate a fetch request
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(MOCK_GOOGLE_CALENDAR_LIST);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].id).toBe("primary");
  });

  it("should mock Google OAuth token endpoint", async () => {
    // Mock OAuth token endpoint
    googleApiServer.use(
      rest.post("https://www.googleapis.com/oauth2/v4/token", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(MOCK_GOOGLE_OAUTH_TOKEN));
      })
    );

    // Simulate OAuth token request
    const response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=authorization_code&code=mock-code",
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.access_token).toBe("mock-access-token");
    expect(data.token_type).toBe("Bearer");
  });

  it("should mock calendar events", async () => {
    // Mock calendar events endpoint
    googleApiServer.use(
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

    // Simulate calendar events request
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].summary).toBe("Test Event");
  });

  it("should handle OAuth errors", async () => {
    // Mock OAuth error
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

    // Simulate failed OAuth request
    const response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=authorization_code&code=invalid-code",
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("invalid_grant");
    expect(data.error_description).toBe("Invalid authorization code");
  });

  it("should provide consistent mock data", () => {
    // Test that mock data is consistent
    expect(MOCK_GOOGLE_CALENDAR_LIST.items).toHaveLength(2);
    expect(MOCK_GOOGLE_EVENT.summary).toBe("Test Event");
    expect(MOCK_GOOGLE_OAUTH_TOKEN.access_token).toBe("mock-access-token");
  });
}); 
