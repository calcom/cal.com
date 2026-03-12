import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/email-manager", () => ({
  sendOrganizerRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendAttendeeRequestEmailAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/di/webhooks/containers/webhook", () => ({
  getWebhookProducer: vi.fn().mockReturnValue({
    queueBookingWebhook: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn().mockImplementation(() => ({
    hasAvailableCredits: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType", () => ({
  getAllWorkflowsFromEventType: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService", () => ({
  WorkflowService: {
    scheduleWorkflowsFilteredByTriggerEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

import { sendAttendeeRequestEmailAndSMS, sendOrganizerRequestEmail } from "@calcom/emails/email-manager";
import { handleBookingRequested } from "./handleBookingRequested";

const makeEvt = () => ({
  title: "Test",
  type: "test-event",
  uid: "test-uid-123",
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T10:30:00Z",
  attendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", language: { locale: "en" } }],
  organizer: { email: "host@test.com", name: "Host", timeZone: "UTC", language: { locale: "en" } },
  bookerUrl: "https://cal.com",
});

const makeBooking = () => ({
  id: 1,
  smsReminderNumber: null,
  eventTypeId: 1,
  userId: 1,
  eventType: {
    id: 1,
    title: "Test Event",
    description: "A test event",
    length: 30,
    price: 0,
    currency: "usd",
    requiresConfirmation: true,
    teamId: null,
    metadata: {},
    workflows: [],
    owner: { hideBranding: false },
    hosts: [],
  },
});

describe("handleBookingRequested", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends organizer request email", async () => {
    await handleBookingRequested({
      evt: makeEvt() as never,
      booking: makeBooking() as never,
    });

    expect(sendOrganizerRequestEmail).toHaveBeenCalled();
  });

  it("sends attendee request email", async () => {
    await handleBookingRequested({
      evt: makeEvt() as never,
      booking: makeBooking() as never,
    });

    expect(sendAttendeeRequestEmailAndSMS).toHaveBeenCalled();
  });

  it("queues webhook when evt.uid is present", async () => {
    const { getWebhookProducer } = await import("@calcom/features/di/webhooks/containers/webhook");
    await handleBookingRequested({
      evt: makeEvt() as never,
      booking: makeBooking() as never,
    });

    const producer = getWebhookProducer();
    expect(producer.queueBookingWebhook).toHaveBeenCalledWith(
      "BOOKING_REQUESTED",
      expect.objectContaining({ bookingUid: "test-uid-123" })
    );
  });

  it("does not throw when webhook queueing fails", async () => {
    const { getWebhookProducer } = await import("@calcom/features/di/webhooks/containers/webhook");
    vi.mocked(getWebhookProducer).mockReturnValue({
      queueBookingWebhook: vi.fn().mockRejectedValue(new Error("webhook error")),
    } as never);

    await expect(
      handleBookingRequested({
        evt: makeEvt() as never,
        booking: makeBooking() as never,
      })
    ).resolves.not.toThrow();
  });
});
