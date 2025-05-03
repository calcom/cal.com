import { vi } from "vitest";

export const fetcherMock = vi.fn();

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
          { id: "cal1", name: "Calendar 1" },
          { id: "cal2", name: "Calendar 2" },
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

  subscriptionCreate: () =>
    new Response(
      JSON.stringify({
        id: "mock-subscription-id",
        expirationDateTime: "2025-05-07T00:00:00",
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
