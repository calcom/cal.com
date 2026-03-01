import type { CalendarEvent } from "@calcom/types/Calendar";
import { describe, expect, it } from "vitest";
import { getWebhookPayloadForBooking } from "./getWebhookPayloadForBooking";

function makeBooking(overrides?: Partial<Parameters<typeof getWebhookPayloadForBooking>[0]["booking"]>) {
  return {
    id: 1,
    eventTypeId: 10,
    userId: 100,
    eventType: {
      title: "30 Min Meeting",
      description: "A quick meeting",
      requiresConfirmation: false,
      price: 0,
      currency: "usd",
      length: 30,
      id: 10,
    },
    ...overrides,
  };
}

function makeEvt(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    type: "30 Min Meeting",
    title: "30 Min Meeting between Host and Guest",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T10:30:00Z",
    organizer: {
      email: "host@example.com",
      name: "Host",
      timeZone: "UTC",
      language: {
        translate: ((key: string) => key) as unknown as CalendarEvent["organizer"]["language"]["translate"],
        locale: "en",
      },
      id: 100,
    },
    attendees: [
      {
        email: "guest@example.com",
        name: "Guest",
        timeZone: "UTC",
        language: {
          translate: ((key: string) => key) as unknown as CalendarEvent["organizer"]["language"]["translate"],
          locale: "en",
        },
      },
    ],
    ...overrides,
  } as CalendarEvent;
}

describe("getWebhookPayloadForBooking", () => {
  it("returns payload with eventType info and bookingId", () => {
    const booking = makeBooking();
    const evt = makeEvt();
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.bookingId).toBe(1);
    expect(payload.eventTitle).toBe("30 Min Meeting");
    expect(payload.eventDescription).toBe("A quick meeting");
    expect(payload.requiresConfirmation).toBeNull();
    expect(payload.price).toBe(0);
    expect(payload.currency).toBe("usd");
    expect(payload.length).toBe(30);
  });

  it("strips assignmentReason from evt", () => {
    const booking = makeBooking();
    const evt = makeEvt({ assignmentReason: { reasonString: "round-robin" } } as Partial<CalendarEvent>);
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload).not.toHaveProperty("assignmentReason");
  });

  it("handles null eventType", () => {
    const booking = makeBooking({ eventType: null });
    const evt = makeEvt();
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.bookingId).toBe(1);
    expect(payload.eventTitle).toBeUndefined();
    expect(payload.eventDescription).toBeUndefined();
    expect(payload.requiresConfirmation).toBeNull();
    expect(payload.price).toBeUndefined();
    expect(payload.currency).toBeUndefined();
    expect(payload.length).toBeUndefined();
  });

  it("preserves evt fields in payload", () => {
    const booking = makeBooking();
    const evt = makeEvt({ title: "Custom Title", location: "https://meet.google.com/abc" });
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.title).toBe("Custom Title");
    expect(payload.location).toBe("https://meet.google.com/abc");
  });

  it("includes organizer and attendees from evt", () => {
    const booking = makeBooking();
    const evt = makeEvt();
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.organizer.email).toBe("host@example.com");
    expect(payload.attendees).toHaveLength(1);
    expect(payload.attendees[0].email).toBe("guest@example.com");
  });

  it("includes startTime and endTime from evt", () => {
    const booking = makeBooking();
    const evt = makeEvt({ startTime: "2024-06-01T09:00:00Z", endTime: "2024-06-01T09:30:00Z" });
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.startTime).toBe("2024-06-01T09:00:00Z");
    expect(payload.endTime).toBe("2024-06-01T09:30:00Z");
  });

  it("handles eventType with requiresConfirmation true", () => {
    const booking = makeBooking({
      eventType: {
        title: "Paid Event",
        description: null,
        requiresConfirmation: true,
        price: 5000,
        currency: "usd",
        length: 60,
        id: 20,
      },
    });
    const evt = makeEvt();
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.requiresConfirmation).toBe(true);
    expect(payload.price).toBe(5000);
    expect(payload.length).toBe(60);
  });

  it("handles null userId and eventTypeId on booking", () => {
    const booking = makeBooking({ userId: null, eventTypeId: null });
    const evt = makeEvt();
    const payload = getWebhookPayloadForBooking({ booking, evt });

    expect(payload.bookingId).toBe(1);
  });
});
