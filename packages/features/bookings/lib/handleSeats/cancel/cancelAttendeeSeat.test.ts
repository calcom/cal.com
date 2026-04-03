import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    bookingSeat: { delete: vi.fn().mockResolvedValue({}) },
    attendee: { delete: vi.fn().mockResolvedValue({}) },
  };
  return { default: mockPrisma };
});

const mockQueueBookingCancelledWebhook = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/di/webhooks/containers/webhook", () => ({
  getWebhookProducer: () => ({
    queueBookingCancelledWebhook: mockQueueBookingCancelledWebhook,
  }),
}));

const mockKVPut = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/di/containers/KV", () => ({
  getKV: () => ({
    put: mockKVPut,
  }),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler", () => ({
  deleteScheduledWorkflowReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  updateMeeting: vi.fn().mockResolvedValue({}),
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getAllDelegationCredentialsForUserIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
  getDelegationCredentialOrFindRegularCredential: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendCancelledSeatEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/ee/workflows/repositories/workflow-repository", () => ({
  WorkflowRepository: { deleteAllWorkflowReminders: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: vi.fn().mockReturnValue(""),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue(((k: string) => k) as never),
}));

import prisma from "@calcom/prisma";
import cancelAttendeeSeat from "./cancelAttendeeSeat";

describe("cancelAttendeeSeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeEvt = () =>
    ({
      type: "Meeting",
      title: "Meeting",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T10:30:00Z",
      organizer: {
        email: "host@example.com",
        name: "Host",
        timeZone: "UTC",
        language: { translate: ((k: string) => k) as never, locale: "en" },
      },
      attendees: [
        { email: "attendee@example.com", name: "Attendee", timeZone: "UTC", language: { locale: "en" } },
      ],
    }) as never;

  const makeBookingToDelete = (overrides = {}) => ({
    id: 1,
    uid: "booking-uid",
    eventTypeId: 1,
    startTime: new Date("2024-01-15T10:00:00Z"),
    endTime: new Date("2024-01-15T10:30:00Z"),
    attendees: [
      { id: 1, email: "attendee@example.com", name: "Attendee", timeZone: "UTC", locale: "en" },
      { id: 2, email: "attendee2@example.com", name: "Attendee 2", timeZone: "UTC", locale: "en" },
    ],
    eventType: {
      seatsPerTimeSlot: 5,
      seatsShowAttendees: false,
      workflows: [],
      hosts: [],
      title: "Meeting",
      requiresConfirmation: false,
      schedulingType: null,
    },
    references: [],
    user: { id: 100, email: "host@example.com", name: "Host", timeZone: "UTC", credentials: [] },
    seatsReferences: [{ referenceUid: "seat-ref-123", attendeeId: 1 }],
    workflowReminders: [],
    userId: 100,
    status: "ACCEPTED",
    iCalUID: "ical-123",
    iCalSequence: 0,
    smsReminderNumber: null,
    ...overrides,
  });

  it("deletes the booking seat reference", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: makeBookingToDelete(),
    };

    await cancelAttendeeSeat(data as never, makeEvt(), null);

    expect(prisma.bookingSeat.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { referenceUid: "seat-ref-123" },
      })
    );
  });

  it("deletes the attendee record", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: makeBookingToDelete({
        attendees: [
          { id: 10, email: "attendee@example.com", name: "Attendee", timeZone: "UTC", locale: "en" },
          { id: 11, email: "attendee2@example.com", name: "Attendee 2", timeZone: "UTC", locale: "en" },
        ],
        seatsReferences: [{ referenceUid: "seat-ref-123", attendeeId: 10 }],
      }),
    };

    await cancelAttendeeSeat(data as never, makeEvt(), null);

    expect(prisma.attendee.delete).toHaveBeenCalled();
  });

  it("stashes cancelled attendee PII in KV and queues PII-free webhook", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: makeBookingToDelete(),
    };

    await cancelAttendeeSeat(data as never, makeEvt(), null, {
      teamId: 42,
      userId: 100,
      orgId: 7,
    });

    // PII should be stashed in short-lived KV, not the queue or booking metadata
    expect(mockKVPut).toHaveBeenCalledWith(
      "webhook:cancelled-seat:seat-ref-123",
      JSON.stringify({
        email: "attendee@example.com",
        name: "Attendee",
        timeZone: "UTC",
        locale: "en",
        phoneNumber: null,
        cancellationReason: null,
      }),
      30 * 60
    );

    // Queue call should have NO PII — only attendeeSeatId to look up from KV
    expect(mockQueueBookingCancelledWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUid: "booking-uid",
        eventTypeId: 1,
        teamId: 42,
        userId: 100,
        orgId: 7,
        attendeeSeatId: "seat-ref-123",
      })
    );
    // No metadata with PII should be passed to the queue
    expect(mockQueueBookingCancelledWebhook).toHaveBeenCalledWith(
      expect.not.objectContaining({ metadata: expect.anything() })
    );
  });

  it("stashes cancellationReason in KV instead of queue metadata", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: makeBookingToDelete(),
    };

    const evtWithReason = { ...makeEvt(), cancellationReason: "Schedule conflict" } as never;

    await cancelAttendeeSeat(data as never, evtWithReason, null, {
      teamId: 42,
      userId: 100,
      orgId: 7,
    });

    // cancellationReason should be stashed in KV alongside attendee PII
    expect(mockKVPut).toHaveBeenCalledWith(
      "webhook:cancelled-seat:seat-ref-123",
      expect.stringContaining('"cancellationReason":"Schedule conflict"'),
      30 * 60
    );

    // Queue call should NOT contain cancellationReason in metadata
    expect(mockQueueBookingCancelledWebhook).toHaveBeenCalledWith(
      expect.not.objectContaining({ metadata: expect.anything() })
    );
  });

  it("does not queue webhook when skipNotifications is true", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: makeBookingToDelete(),
    };

    await cancelAttendeeSeat(data as never, makeEvt(), null, {
      skipNotifications: true,
    });

    expect(mockQueueBookingCancelledWebhook).not.toHaveBeenCalled();
  });
});
