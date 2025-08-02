// Mock data for Google APIs (shared with MSW)
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

// Simple mock data exports for e2e tests
export const mockGoogleApis = {
  calendar: {
    calendar_v3: {
      Calendar: () => ({
        calendarList: {
          list: () => Promise.resolve({ data: MOCK_GOOGLE_CALENDAR_LIST }),
        },
        calendars: {
          get: () => Promise.resolve({ data: MOCK_GOOGLE_CALENDAR }),
        },
        events: {
          list: () => Promise.resolve({
            data: {
              items: [MOCK_GOOGLE_EVENT],
              nextPageToken: null,
            },
          }),
          insert: () => Promise.resolve({
            data: {
              ...MOCK_GOOGLE_EVENT,
              id: `mock-event-${Date.now()}`,
            },
          }),
          update: () => Promise.resolve({ data: MOCK_GOOGLE_EVENT }),
          delete: () => Promise.resolve({ data: {} }),
          watch: () => Promise.resolve({
            data: {
              kind: "api#channel",
              id: "mock-channel-id",
              resourceId: "mock-resource-id",
              resourceUri: "mock-resource-uri",
              expiration: "1111111111",
            },
          }),
        },
        freebusy: {
          query: () => Promise.resolve({ data: MOCK_GOOGLE_FREE_BUSY }),
        },
        channels: {
          stop: () => Promise.resolve(undefined),
        },
      }),
    },
  },
  oauth2: {
    oauth2_v2: {
      Oauth2: () => ({
        userinfo: {
          get: () => Promise.resolve({
            data: {
              id: "mock-user-id",
              email: "user@example.com",
              name: "Test User",
              picture: "https://example.com/avatar.jpg",
            },
          }),
        },
      }),
    },
  },
  admin: {
    admin_directory_v1: {
      Admin: () => ({
        users: {
          list: () => Promise.resolve({
            data: {
              users: [
                {
                  id: "mock-admin-user-id",
                  primaryEmail: "admin@example.com",
                  name: {
                    fullName: "Admin User",
                  },
                },
              ],
            },
          }),
        },
      }),
    },
  },
};

// Export mock data for consistency
export {
  MOCK_GOOGLE_CALENDAR_LIST,
  MOCK_GOOGLE_CALENDAR,
  MOCK_GOOGLE_EVENT,
  MOCK_GOOGLE_FREE_BUSY,
  MOCK_GOOGLE_OAUTH_TOKEN,
}; 
