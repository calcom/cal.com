import { describe, expect, test, vi } from "vitest";

import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { addBookingManagementUrlsToWebhookPayload } from "./addBookingManagementUrlsToWebhookPayload";

const t = vi.fn();

const buildPayload = (overrides: Partial<EventPayloadType> = {}): EventPayloadType => ({
  type: "30min",
  title: "Intro call",
  startTime: "2026-04-01T10:00:00.000Z",
  endTime: "2026-04-01T10:30:00.000Z",
  organizer: {
    name: "Organizer",
    email: "organizer@example.com",
    timeZone: "UTC",
    language: { translate: t as any, locale: "en" },
    username: "organizer",
  },
  attendees: [
    {
      name: "Booker",
      email: "booker@example.com",
      timeZone: "UTC",
      language: { translate: t as any, locale: "en" },
    },
  ],
  uid: "booking_uid",
  status: "ACCEPTED",
  ...overrides,
});

describe("addBookingManagementUrlsToWebhookPayload", () => {
  test("includes cancellation + reschedule URLs for accepted bookings", () => {
    const payload = buildPayload();

    const enriched = addBookingManagementUrlsToWebhookPayload(payload);

    expect(enriched.cancellationUrl).toBe(
      `${WEBAPP_URL}/booking/${payload.uid}?cancel=true&allRemainingBookings=false`
    );
    expect(enriched.rescheduleUrl).toBe(`${WEBAPP_URL}/reschedule/${payload.uid}`);
  });

  test("does not include management URLs for pending bookings", () => {
    const payload = buildPayload({ status: "PENDING" });

    const enriched = addBookingManagementUrlsToWebhookPayload(payload);

    expect(enriched.cancellationUrl).toBeUndefined();
    expect(enriched.rescheduleUrl).toBeUndefined();
  });

  test("does not include URL when cancelling/rescheduling is disabled", () => {
    const payload = buildPayload({ disableCancelling: true, disableRescheduling: true });

    const enriched = addBookingManagementUrlsToWebhookPayload(payload);

    expect(enriched.cancellationUrl).toBeUndefined();
    expect(enriched.rescheduleUrl).toBeUndefined();
  });
});
