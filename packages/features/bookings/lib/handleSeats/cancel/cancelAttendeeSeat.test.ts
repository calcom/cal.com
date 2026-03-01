import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    bookingSeat: { delete: vi.fn().mockResolvedValue({}) },
    attendee: { delete: vi.fn().mockResolvedValue({}) },
    booking: { update: vi.fn().mockResolvedValue({}) },
  };
  return { default: mockPrisma };
});

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  sendGenericWebhookPayload: vi.fn().mockResolvedValue({ ok: true }),
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

vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: { deleteAllWorkflowReminders: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn().mockResolvedValue(undefined),
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

  it("deletes the booking seat reference", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: {
        id: 1,
        uid: "booking-uid",
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
      },
    };

    const dataForWebhooks = {
      webhooks: [],
      evt: {
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
      } as never,
      eventTypeInfo: {
        eventTitle: "Meeting",
        eventDescription: null,
        requiresConfirmation: false,
        price: 0,
        currency: "usd",
        length: 30,
      },
    };

    await cancelAttendeeSeat(data as never, dataForWebhooks as never, null);

    expect(prisma.bookingSeat.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { referenceUid: "seat-ref-123" },
      })
    );
  });

  it("deletes the attendee record", async () => {
    const data = {
      seatReferenceUid: "seat-ref-123",
      bookingToDelete: {
        id: 1,
        uid: "booking-uid",
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T10:30:00Z"),
        attendees: [
          { id: 10, email: "attendee@example.com", name: "Attendee", timeZone: "UTC", locale: "en" },
          { id: 11, email: "attendee2@example.com", name: "Attendee 2", timeZone: "UTC", locale: "en" },
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
        seatsReferences: [{ referenceUid: "seat-ref-123", attendeeId: 10 }],
        workflowReminders: [],
        userId: 100,
        status: "ACCEPTED",
        iCalUID: "ical-123",
        iCalSequence: 0,
        smsReminderNumber: null,
      },
    };

    const dataForWebhooks = {
      webhooks: [],
      evt: {
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
      } as never,
      eventTypeInfo: {
        eventTitle: "Meeting",
        eventDescription: null,
        requiresConfirmation: false,
        price: 0,
        currency: "usd",
        length: 30,
      },
    };

    await cancelAttendeeSeat(data as never, dataForWebhooks as never, null);

    expect(prisma.attendee.delete).toHaveBeenCalled();
  });
});
