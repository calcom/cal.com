import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendScheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendOrganizerRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendAttendeeRequestEmailAndSMS: vi.fn().mockResolvedValue(undefined),
  sendAddGuestsEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendAddAttendeeEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendRoundRobinRescheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendReassignedScheduledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
  sendRoundRobinCancelledEmailsAndSMS: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/ee/workflows/lib/allowDisablingStandardEmails", () => ({
  allowDisablingHostConfirmationEmails: vi.fn().mockReturnValue(false),
  allowDisablingAttendeeConfirmationEmails: vi.fn().mockReturnValue(false),
}));

import { BookingActionMap, BookingEmailSmsHandler } from "./BookingEmailSmsHandler";

const makeLogger = () => ({
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  getSubLogger: vi.fn().mockReturnValue({
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
});

const makeEvt = () => ({
  title: "Test",
  startTime: "2024-01-15T10:00:00Z",
  endTime: "2024-01-15T10:30:00Z",
  attendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", language: { locale: "en" } }],
  organizer: { email: "host@test.com", name: "Host", timeZone: "UTC", language: { locale: "en" } },
});

describe("BookingEmailSmsHandler", () => {
  let handler: BookingEmailSmsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BookingEmailSmsHandler({ logger: makeLogger() as never });
  });

  it("sends rescheduled emails for BOOKING_RESCHEDULED action", async () => {
    await handler.send({
      action: BookingActionMap.rescheduled,
      data: {
        evt: makeEvt(),
        eventType: { metadata: undefined, schedulingType: null },
        rescheduleReason: "time change",
        additionalInformation: {},
        additionalNotes: "notes",
        iCalUID: "ical-uid",
        users: [],
        changedOrganizer: false,
        isRescheduledByBooker: false,
        originalRescheduledBooking: {
          id: 1,
          uid: "orig-uid",
          title: "Test",
          startTime: new Date(),
          endTime: new Date(),
          attendees: [],
          user: null,
        },
      },
    } as never);

    const { sendRescheduledEmailsAndSMS } = await import("@calcom/emails/email-manager");
    expect(sendRescheduledEmailsAndSMS).toHaveBeenCalled();
  });

  it("sends confirmed emails for BOOKING_CONFIRMED action", async () => {
    await handler.send({
      action: BookingActionMap.confirmed,
      data: {
        evt: makeEvt(),
        eventType: { metadata: undefined, schedulingType: null },
        workflows: [],
        eventNameObject: {},
        additionalInformation: {},
        additionalNotes: "notes",
        customInputs: null,
      },
    } as never);

    const { sendScheduledEmailsAndSMS } = await import("@calcom/emails/email-manager");
    expect(sendScheduledEmailsAndSMS).toHaveBeenCalled();
  });

  it("sends request emails for BOOKING_REQUESTED action", async () => {
    await handler.send({
      action: BookingActionMap.requested,
      data: {
        evt: makeEvt(),
        eventType: { metadata: undefined, schedulingType: null },
        attendees: [{ name: "A", email: "a@test.com", timeZone: "UTC", language: { locale: "en" } }],
        additionalNotes: "notes",
      },
    } as never);

    const { sendOrganizerRequestEmail } = await import("@calcom/emails/email-manager");
    expect(sendOrganizerRequestEmail).toHaveBeenCalled();
  });

  it("skips requested emails when no attendees", async () => {
    await handler.send({
      action: BookingActionMap.requested,
      data: {
        evt: makeEvt(),
        eventType: { metadata: undefined, schedulingType: null },
        attendees: [],
        additionalNotes: null,
      },
    } as never);

    const { sendOrganizerRequestEmail } = await import("@calcom/emails/email-manager");
    expect(sendOrganizerRequestEmail).not.toHaveBeenCalled();
  });

  it("handles add guests notification", async () => {
    await handler.handleAddGuests({
      evt: makeEvt() as never,
      eventType: { metadata: undefined, schedulingType: null },
      newGuests: ["guest@test.com"],
    });

    const { sendAddGuestsEmailsAndSMS } = await import("@calcom/emails/email-manager");
    expect(sendAddGuestsEmailsAndSMS).toHaveBeenCalled();
  });

  it("handles add attendee notification", async () => {
    await handler.handleAddAttendee({
      evt: makeEvt() as never,
      eventType: { metadata: undefined, schedulingType: null },
      newGuests: ["attendee@test.com"],
    });

    const { sendAddAttendeeEmailsAndSMS } = await import("@calcom/emails/email-manager");
    expect(sendAddAttendeeEmailsAndSMS).toHaveBeenCalled();
  });
});
