import { vi } from "vitest";

export const defaultFetcherMockImplementation = vi.fn(async (endpoint, init) => {
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
  if (endpoint === "/subscriptions") return mockResponses.subscriptionCreate();
  if (endpoint.includes("/subscriptions/")) return mockResponses.subscriptionDelete();
  if (endpoint === "/users/user@example.com") return mockResponses.user();
  if (endpoint.includes("/calendars?$select")) return mockResponses.calendars();
  return new Response(null, { status: 404 });
});

export const mockResponses = {
  user: () =>
    new Response(
      JSON.stringify({
        userPrincipalName: "user@example.com",
        id: "user123",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  calendars: () =>
    new Response(
      JSON.stringify({
        value: [
          { id: "cal1", name: "Calendar 1", isDefaultCalendar: true },
          { id: "cal2", name: "Calendar 2", isDefaultCalendar: false },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

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
                start: { dateTime: "2025-05-04T10:00:00" },
                end: { dateTime: "2025-05-04T11:00:00" },
              },
            ],
          },
        })),
      })
    ),

  batchAvailabilityPagination: (calendarIds: string[]) => {
    return calendarIds.map((id, index) => ({
      id: index.toString(),
      status: 200,
      body: {
        value: [
          {
            showAs: "busy",
            start: { dateTime: "2025-05-04T10:00:00Z" },
            end: { dateTime: "2025-05-04T11:00:00Z" },
          },
        ],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/users/user@example.com/calendars/cal1/calendarView?next",
      },
    }));
  },

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
                  start: { dateTime: "2025-05-04T12:00:00Z" },
                  end: { dateTime: "2025-05-04T13:00:00Z" },
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

  subscriptionCreate: () =>
    new Response(
      JSON.stringify({
        id: "mock-subscription-id",
        expirationDateTime: "2025-05-07T00:00:00Z",
      })
    ),

  subscriptionDelete: () =>
    new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    }),

  eventCreate: () =>
    new Response(
      JSON.stringify({
        id: "event123",
        iCalUId: "ical123",
        subject: "Test Event",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    ),

  eventUpdate: () =>
    new Response(
      JSON.stringify({
        id: "event123",
        iCalUId: "ical123",
        subject: "Updated Event",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    ),

  eventDelete: () =>
    new Response(null, {
      status: 204,
      headers: { "Content-Type": "application/json" },
    }),
};
