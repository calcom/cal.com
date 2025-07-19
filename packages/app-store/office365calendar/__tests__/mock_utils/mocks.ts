import { vi } from "vitest";

import { TEST_DATES, generateMockData } from "../dates";

// Type definitions for test scenarios
interface MockTeamMember {
  id: number;
  email: string;
  name: string;
  calendars: {
    externalId: string;
    integration: string;
    primary: boolean;
    busyTimes: any[];
  }[];
}

/**
 * Mock Response class that properly implements the Response interface
 * with correct ok property based on status code
 */
class MockResponse {
  public status: number;
  public statusText: string;
  public headers: Headers;
  private _body: string | null;

  constructor(body: string | null, init: { status: number; headers?: Record<string, string> }) {
    this.status = init.status;
    this.statusText = this.getStatusText(init.status);
    this.headers = new Headers(init.headers || {});
    this._body = body;
  }

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  async json(): Promise<any> {
    if (!this._body) return null;
    return JSON.parse(this._body);
  }

  async text(): Promise<string> {
    return this._body || "";
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: "OK",
      201: "Created",
      204: "No Content",
      400: "Bad Request",
      401: "Unauthorized",
      404: "Not Found",
      429: "Too Many Requests",
      500: "Internal Server Error",
    };
    return statusTexts[status] || "Unknown";
  }
}

/**
 * Mock responses for Microsoft Graph API
 * Focused on testing calendar optimization scenarios
 */

export const defaultFetcherMockImplementation = vi.fn(async (endpoint, init) => {
  const method = init?.method || "GET";

  if (endpoint === "/me") {
    return mockResponses.user();
  }
  if (endpoint.includes("/$batch")) {
    const batchResponse = await mockResponses.batchAvailability(["cal1"]).json();
    return Promise.resolve({
      status: 200,
      headers: new Map([
        ["Content-Type", "application/json"],
        ["Retry-After", "0"],
      ]),
      json: async () => Promise.resolve({ responses: batchResponse.responses }),
    });
  }

  // Handle subscription endpoints based on HTTP method
  if (endpoint.includes("/subscriptions")) {
    if (method === "POST") {
      return mockResponses.subscriptionCreate();
    } else if (method === "PATCH") {
      return mockResponses.subscriptionRenew();
    } else if (method === "DELETE") {
      return mockResponses.subscriptionDelete();
    } else if (method === "GET") {
      return mockResponses.subscriptionsList();
    }
  }

  // Handle event endpoints
  if (endpoint.includes("/events")) {
    if (method === "POST") {
      return mockResponses.eventCreate();
    } else if (method === "PATCH") {
      return mockResponses.eventUpdate();
    } else if (method === "DELETE") {
      return mockResponses.eventDelete();
    }
  }

  if (endpoint === "/users/user@example.com") return mockResponses.user();
  if (endpoint.includes("/calendars?$select")) return mockResponses.calendars();
  if (endpoint.includes("/calendarView")) return mockResponses.calendarView();

  return new Response(null, { status: 404 });
});

export const mockResponses = {
  /**
   * Mock user response from Graph API
   */
  user: () =>
    new MockResponse(
      JSON.stringify({
        userPrincipalName: "user@example.com",
        id: "user123",
        displayName: "Test User",
        mail: "user@example.com",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock calendars list response
   * Testing multiple calendar optimization scenarios
   */
  calendars: (count = 2) =>
    new Response(
      JSON.stringify({
        value: Array.from({ length: count }, (_, i) => ({
          id: `cal${i + 1}`,
          name: `Calendar ${i + 1}`,
          isDefaultCalendar: i === 0,
          canEdit: true,
          canShare: true,
          canViewPrivateItems: true,
          color: "auto",
          isRemovable: i !== 0,
        })),
        "@odata.nextLink": count > 10 ? "https://graph.microsoft.com/v1.0/me/calendars?$skip=10" : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock batch availability response for calendar optimization testing
   */
  batchAvailability: (calendarIds: string[]) =>
    new Response(
      JSON.stringify({
        responses: calendarIds.map((id, index) => ({
          id: index.toString(),
          status: 200,
          body: {
            value: [
              {
                showAs: "busy",
                start: { dateTime: TEST_DATES.TOMORROW_9AM },
                end: { dateTime: TEST_DATES.TOMORROW_10AM },
                subject: "Team Meeting",
                id: `event-${id}-1`,
                createdDateTime: new Date().toISOString(),
              },
              {
                showAs: "busy",
                start: { dateTime: TEST_DATES.TOMORROW_2PM },
                end: { dateTime: TEST_DATES.TOMORROW_3PM },
                subject: "Client Call",
                id: `event-${id}-2`,
                createdDateTime: new Date().toISOString(),
              },
            ],
          },
        })),
      })
    ),

  /**
   * Mock batch availability response with pagination
   * For testing large calendar scenarios
   */
  batchAvailabilityPagination: (calendarIds: string[]) => {
    return calendarIds.map((id, index) => ({
      id: index.toString(),
      status: 200,
      body: {
        value: [
          {
            showAs: "busy",
            start: { dateTime: TEST_DATES.TOMORROW_9AM },
            end: { dateTime: TEST_DATES.TOMORROW_10AM },
            subject: "Morning Meeting",
            id: `event-${id}-page1`,
          },
        ],
        "@odata.nextLink": `https://graph.microsoft.com/v1.0/users/user@example.com/calendars/${id}/calendarView?next`,
      },
    }));
  },

  /**
   * Mock next page response for pagination testing
   */
  nextPage: () =>
    new Response(
      JSON.stringify({
        responses: [
          {
            id: "0",
            status: 200,
            body: {
              value: [
                {
                  showAs: "busy",
                  start: { dateTime: TEST_DATES.TOMORROW_2PM },
                  end: { dateTime: TEST_DATES.TOMORROW_3PM },
                  subject: "Afternoon Meeting",
                  id: "event-next-page-1",
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "0",
        },
      }
    ),

  /**
   * Mock subscription creation response for webhook optimization
   */
  subscriptionCreate: () =>
    new MockResponse(
      JSON.stringify({
        id: "mock-subscription-id",
        resource: "/me/calendars('cal1')/events",
        changeType: "created,updated,deleted",
        expirationDateTime: TEST_DATES.EXTENDED_END_ISO,
        notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
        clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock subscription deletion response
   */
  subscriptionDelete: () =>
    new MockResponse(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    }),

  /**
   * Mock event creation response
   */
  eventCreate: () =>
    new Response(
      JSON.stringify({
        id: "event123",
        iCalUId: "ical123",
        subject: "Test Event",
        start: { dateTime: TEST_DATES.TOMORROW_9AM },
        end: { dateTime: TEST_DATES.TOMORROW_10AM },
        createdDateTime: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock event update response
   */
  eventUpdate: () =>
    new Response(
      JSON.stringify({
        id: "event123",
        iCalUId: "ical123",
        subject: "Updated Event",
        start: { dateTime: TEST_DATES.TOMORROW_9AM },
        end: { dateTime: TEST_DATES.TOMORROW_10AM },
        lastModifiedDateTime: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock event deletion response
   */
  eventDelete: () =>
    new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    }),

  /**
   * Mock rate limiting response (429)
   * For testing optimization under rate limits
   */
  rateLimited: () =>
    new Response(
      JSON.stringify({
        error: {
          code: "TooManyRequests",
          message: "Rate limit exceeded",
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    ),

  /**
   * Mock authentication error response
   */
  authError: () =>
    new Response(
      JSON.stringify({
        error: {
          code: "InvalidAuthenticationToken",
          message: "Access token has expired or is invalid",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock server error response
   */
  serverError: () =>
    new Response(
      JSON.stringify({
        error: {
          code: "InternalServerError",
          message: "Internal server error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock subscription renewal response
   */
  subscriptionRenew: () =>
    new MockResponse(
      JSON.stringify({
        id: "mock-subscription-id",
        resource: "/me/calendars('cal1')/events",
        changeType: "created,updated,deleted",
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
        clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock subscriptions list response
   */
  subscriptionsList: () =>
    new MockResponse(
      JSON.stringify({
        value: [
          {
            id: "subscription-1",
            resource: "/me/calendars('cal1')/events",
            changeType: "created,updated,deleted",
            expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
            clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
          },
          {
            id: "subscription-2",
            resource: "/me/calendars('cal2')/events",
            changeType: "created,updated,deleted",
            expirationDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            notificationUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`,
            clientState: process.env.MICROSOFT_WEBHOOK_TOKEN,
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  /**
   * Mock calendar view response (for availability checking)
   */
  calendarView: () =>
    new Response(
      JSON.stringify({
        value: [
          {
            id: "event1",
            subject: "Team Meeting",
            start: { dateTime: TEST_DATES.TOMORROW_9AM },
            end: { dateTime: TEST_DATES.TOMORROW_10AM },
            showAs: "busy",
            createdDateTime: new Date().toISOString(),
          },
          {
            id: "event2",
            subject: "Client Call",
            start: { dateTime: TEST_DATES.TOMORROW_2PM },
            end: { dateTime: TEST_DATES.TOMORROW_3PM },
            showAs: "busy",
            createdDateTime: new Date().toISOString(),
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),
};

/**
 * Mock webhook notification payloads
 * For testing change notification optimization
 */
export const mockWebhookPayloads = {
  /**
   * Valid webhook notification
   */
  validNotification: (subscriptionId: string, calendarId: string) => ({
    value: [
      {
        subscriptionId,
        clientState: process.env.MICROSOFT_WEBHOOK_TOKEN || "test-webhook-token",
        resource: `me/calendars/${calendarId}/events/event123`,
        changeType: "created",
        subscriptionExpirationDateTime: TEST_DATES.EXTENDED_END_ISO,
        resourceData: {
          "@odata.type": "#Microsoft.Graph.Event",
          "@odata.id": `me/calendars/${calendarId}/events/event123`,
          "@odata.etag": 'W/"123"',
          id: "event123",
        },
        tenantId: "tenant123",
      },
    ],
  }),

  /**
   * Webhook validation request
   */
  validation: (validationToken: string) => ({
    validationToken,
  }),

  /**
   * Multiple notifications for testing batch processing
   */
  multipleNotifications: (subscriptionIds: string[], calendarIds: string[]) => ({
    value: subscriptionIds.flatMap((subId, index) =>
      calendarIds.map((calId) => ({
        subscriptionId: subId,
        clientState: process.env.MICROSOFT_WEBHOOK_TOKEN || "test-webhook-token",
        resource: `me/calendars/${calId}/events/event${index}`,
        changeType: index % 2 === 0 ? "created" : "updated",
        subscriptionExpirationDateTime: TEST_DATES.EXTENDED_END_ISO,
        resourceData: {
          "@odata.type": "#Microsoft.Graph.Event",
          "@odata.id": `me/calendars/${calId}/events/event${index}`,
          "@odata.etag": `W/"${index}"`,
          id: `event${index}`,
        },
        tenantId: "tenant123",
      }))
    ),
  }),

  /**
   * Invalid webhook notification (wrong client state)
   */
  invalidNotification: (subscriptionId: string, calendarId: string) => ({
    value: [
      {
        subscriptionId,
        clientState: "invalid-token",
        resource: `me/calendars/${calendarId}/events/event123`,
        changeType: "created",
        subscriptionExpirationDateTime: TEST_DATES.EXTENDED_END_ISO,
        resourceData: {
          "@odata.type": "#Microsoft.Graph.Event",
          "@odata.id": `me/calendars/${calendarId}/events/event123`,
          "@odata.etag": 'W/"123"',
          id: "event123",
        },
        tenantId: "tenant123",
      },
    ],
  }),
};

/**
 * Mock team event scenarios for round-robin testing
 */
export const mockTeamEventScenarios = {
  /**
   * Team with multiple members and calendars
   */
  multiMemberTeam: (memberCount = 3, calendarsPerMember = 2) => {
    const team: MockTeamMember[] = [];
    for (let i = 1; i <= memberCount; i++) {
      const member: MockTeamMember = {
        id: i,
        email: `member${i}@example.com`,
        name: `Team Member ${i}`,
        calendars: [],
      };

      for (let j = 1; j <= calendarsPerMember; j++) {
        member.calendars.push({
          externalId: `member${i}-cal${j}`,
          integration: "office365_calendar",
          primary: j === 1,
          busyTimes: generateMockData.calendarEvents(i + j),
        });
      }

      team.push(member);
    }
    return team;
  },

  /**
   * Round-robin availability scenarios
   */
  roundRobinAvailability: (teamSize = 3, daysAhead = 7) => {
    const scenarios = [];
    for (let day = 1; day <= daysAhead; day++) {
      const dayScenario = {
        day,
        members: [] as Array<{
          memberId: number;
          available: boolean;
          busySlots: { start: string; end: string }[];
        }>,
      };

      for (let member = 1; member <= teamSize; member++) {
        dayScenario.members.push({
          memberId: member,
          available: member % 3 !== 0, // Deterministic: every 3rd member is unavailable
          busySlots:
            member % 2 === 0 ? [{ start: TEST_DATES.TOMORROW_9AM, end: TEST_DATES.TOMORROW_10AM }] : [],
        });
      }

      scenarios.push(dayScenario);
    }
    return scenarios;
  },
};
