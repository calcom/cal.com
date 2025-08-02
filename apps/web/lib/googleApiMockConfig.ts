/**
 * Google API Mocking Configuration
 * 
 * This module provides environment-based switching for Google API mocking.
 * Set GOOGLE_API_MOCK=true to enable mocking in development.
 */

// Check if Google API mocking is enabled
export const isGoogleApiMockingEnabled = () => {
  return process.env.GOOGLE_API_MOCK === "true" || process.env.NODE_ENV === "test";
};

// Mock data exports for consistency across MSW and library mocks
export const MOCK_GOOGLE_DATA = {
  calendarList: {
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
  },
  calendar: {
    id: "primary",
    summary: "Primary Calendar",
    timeZone: "America/New_York",
    primary: true,
  },
  event: {
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
  },
  freeBusy: {
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
  },
  oauthToken: {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    token_type: "Bearer",
    expiry_date: Date.now() + 3600000, // 1 hour from now
  },
  userInfo: {
    id: "mock-user-id",
    email: "user@example.com",
    name: "Test User",
    picture: "https://example.com/avatar.jpg",
  },
};

// Helper to conditionally import mocks
export const getGoogleApiMocks = async () => {
  if (isGoogleApiMockingEnabled()) {
    // Import MSW handlers for frontend
    const { googleApiHandlers, googleApiServer } = await import("../playwright/lib/googleApiMocks");
    
    // Import library mocks for backend
    await import("../packages/app-store/googlecalendar/lib/__mocks__/googleapis-dev");
    
    return {
      googleApiHandlers,
      googleApiServer,
      isEnabled: true,
    };
  }
  
  return {
    googleApiHandlers: [],
    googleApiServer: null,
    isEnabled: false,
  };
};

// Helper to setup mocking in development
export const setupGoogleApiMocking = async () => {
  if (isGoogleApiMockingEnabled()) {
    console.log("🔧 Google API mocking enabled");
    
    // Setup MSW for frontend
    const { enableGoogleApiMocking } = await import("../playwright/lib/googleApiMocks");
    enableGoogleApiMocking();
    
    // Setup library mocks for backend
    await import("../packages/app-store/googlecalendar/lib/__mocks__/googleapis-dev");
    
    return true;
  }
  
  console.log("🌐 Google API mocking disabled - using real APIs");
  return false;
};

// Helper to teardown mocking
export const teardownGoogleApiMocking = async () => {
  if (isGoogleApiMockingEnabled()) {
    const { disableGoogleApiMocking } = await import("../playwright/lib/googleApiMocks");
    disableGoogleApiMocking();
  }
}; 
