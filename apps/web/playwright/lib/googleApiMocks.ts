import type { DefaultBodyType } from "msw";
import { rest } from "msw";
import { setupServer } from "msw/node";

// Mock data for Google APIs
export const MOCK_GOOGLE_CALENDAR_LIST = {
  items: [
    {
      id: "primary",
      summary: "Primary Calendar",
      primary: true,
      accessRole: "owner",
    },
    {
      id: "work@example.com",
      summary: "Work Calendar",
      primary: false,
      accessRole: "owner",
    },
  ],
};

export const MOCK_GOOGLE_CALENDAR = {
  id: "primary",
  summary: "Primary Calendar",
  timeZone: "America/New_York",
  primary: true,
};

export const MOCK_GOOGLE_EVENT = {
  id: "mock-event-id",
  summary: "Test Event",
  description: "Test event description",
  start: {
    dateTime: "2024-01-15T10:00:00-05:00",
    timeZone: "America/New_York",
  },
  end: {
    dateTime: "2024-01-15T11:00:00-05:00",
    timeZone: "America/New_York",
  },
  attendees: [
    {
      email: "attendee@example.com",
      responseStatus: "accepted",
    },
  ],
  organizer: {
    email: "organizer@example.com",
    displayName: "Test Organizer",
  },
};

export const MOCK_GOOGLE_FREE_BUSY = {
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
};

export const MOCK_GOOGLE_OAUTH_TOKEN = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
  token_type: "Bearer",
  expiry_date: Date.now() + 3600000, // 1 hour from now
};

export const MOCK_GOOGLE_USER_INFO = {
  id: "mock-user-id",
  email: "user@example.com",
  name: "Test User",
  picture: "https://example.com/avatar.jpg",
};

// Google API endpoints to mock
const GOOGLE_API_BASE = "https://www.googleapis.com";

// MSW handlers for Google APIs
export const googleApiHandlers = [
  // OAuth2 Token endpoint
  rest.post(`${GOOGLE_API_BASE}/oauth2/v4/token`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(MOCK_GOOGLE_OAUTH_TOKEN));
  }),

  // Google Calendar API
  rest.get(`${GOOGLE_API_BASE}/calendar/v3/calendars`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(MOCK_GOOGLE_CALENDAR_LIST));
  }),

  rest.get(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId`, (req, res, ctx) => {
    const { calendarId } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        ...MOCK_GOOGLE_CALENDAR,
        id: calendarId as string,
      })
    );
  }),

  rest.get(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId/events`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        items: [MOCK_GOOGLE_EVENT],
        nextPageToken: null,
      })
    );
  }),

  rest.post(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId/events`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ...MOCK_GOOGLE_EVENT,
        id: `mock-event-${Date.now()}`,
      })
    );
  }),

  rest.put(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId/events/:eventId`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(MOCK_GOOGLE_EVENT));
  }),

  rest.delete(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId/events/:eventId`, (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  rest.post(`${GOOGLE_API_BASE}/calendar/v3/freeBusy`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(MOCK_GOOGLE_FREE_BUSY));
  }),

  // Google OAuth2 User Info
  rest.get(`${GOOGLE_API_BASE}/oauth2/v2/userinfo`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(MOCK_GOOGLE_USER_INFO));
  }),

  // Google Admin Directory API
  rest.get(`${GOOGLE_API_BASE}/admin/directory/v1/users`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        users: [
          {
            id: "mock-admin-user-id",
            primaryEmail: "admin@example.com",
            name: {
              fullName: "Admin User",
            },
          },
        ],
      })
    );
  }),

  // Google Drive API (if needed)
  rest.get(`${GOOGLE_API_BASE}/drive/v3/files`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        files: [
          {
            id: "mock-file-id",
            name: "Mock File",
            mimeType: "application/vnd.google-apps.document",
          },
        ],
      })
    );
  }),

  // Catch-all for unmocked Google API endpoints
  rest.all(`${GOOGLE_API_BASE}/**`, (req, res, ctx) => {
    console.warn(`Unmocked Google API call: ${req.method} ${req.url}`);
    return res(ctx.status(501), ctx.json({ error: "Not implemented in mocks" }));
  }),
];

// Setup MSW server for Google APIs
export const googleApiServer = setupServer(...googleApiHandlers);

// Helper to enable Google API mocking
export const enableGoogleApiMocking = () => {
  googleApiServer.listen({
    onUnhandledRequest: "warn",
  });
};

// Helper to disable Google API mocking
export const disableGoogleApiMocking = () => {
  googleApiServer.close();
};

// Helper to reset handlers
export const resetGoogleApiHandlers = () => {
  googleApiServer.resetHandlers();
};

// Custom handlers for specific test scenarios
export const createGoogleApiHandlers = {
  // Mock successful OAuth flow
  oauthSuccess: () => [
    rest.post(`${GOOGLE_API_BASE}/oauth2/v4/token`, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(MOCK_GOOGLE_OAUTH_TOKEN));
    }),
  ],

  // Mock OAuth failure
  oauthFailure: () => [
    rest.post(`${GOOGLE_API_BASE}/oauth2/v4/token`, (req, res, ctx) => {
      return res(
        ctx.status(400),
        ctx.json({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        })
      );
    }),
  ],

  // Mock calendar with specific events
  calendarWithEvents: (events: any[] = [MOCK_GOOGLE_EVENT]) => [
    rest.get(`${GOOGLE_API_BASE}/calendar/v3/calendars/:calendarId/events`, (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          items: events,
          nextPageToken: null,
        })
      );
    }),
  ],

  // Mock busy calendar
  busyCalendar: () => [
    rest.post(`${GOOGLE_API_BASE}/calendar/v3/freeBusy`, (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          timeMin: "2024-01-15T00:00:00Z",
          timeMax: "2024-01-16T00:00:00Z",
          calendars: {
            primary: {
              busy: [
                {
                  start: "2024-01-15T09:00:00Z",
                  end: "2024-01-15T17:00:00Z",
                },
              ],
            },
          },
        })
      );
    }),
  ],
}; 
