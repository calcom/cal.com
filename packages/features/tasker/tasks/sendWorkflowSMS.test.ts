import { describe, expect, vi, beforeEach } from "vitest";

import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { ZSendWorkflowSMSSchema, sendWorkflowSMS } from "./sendWorkflowSMS";

// --- Mocks ---

const mockFindByIdForSMSTask = vi.fn();
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository", () => ({
  WorkflowReminderRepository: vi.fn().mockImplementation(function () {
    return {
      findByIdForSMSTask: (...args: unknown[]) => mockFindByIdForSMSTask(...args),
    };
  }),
}));

const mockIsOptedOut = vi.fn().mockResolvedValue(false);
vi.mock("@calcom/features/ee/workflows/lib/repository/workflowOptOutContact", () => ({
  WorkflowOptOutContactRepository: {
    isOptedOut: (...args: unknown[]) => mockIsOptedOut(...args),
  },
}));

const mockFindFirst = vi.fn();
vi.mock("@calcom/prisma", () => ({
  default: {
    profile: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  },
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({ responses: {} }),
}));

const mockGetByReferenceUidWithAttendeeDetails = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingSeatRepository", () => ({
  BookingSeatRepository: vi.fn().mockImplementation(function () {
    return {
      getByReferenceUidWithAttendeeDetails: mockGetByReferenceUidWithAttendeeDetails,
    };
  }),
}));

const mockHasAvailableCredits = vi.fn().mockResolvedValue(true);
vi.mock("@calcom/features/ee/billing/credit-service", () => ({
  CreditService: vi.fn().mockImplementation(function () {
    return {
      hasAvailableCredits: mockHasAvailableCredits,
    };
  }),
}));

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("@calcom/features/ee/workflows/lib/alphanumericSenderIdSupport", () => ({
  getSenderId: vi.fn().mockReturnValue("CalSender"),
}));

vi.mock("@calcom/features/ee/workflows/lib/getWorkflowReminders", () => ({
  select: {},
  getWorkflowRecipientEmail: vi.fn().mockReturnValue("attendee@example.com"),
}));

vi.mock("@calcom/features/ee/workflows/lib/actionHelperFunctions", () => ({
  isAttendeeAction: vi.fn((action: string) => action === "SMS_ATTENDEE"),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/templates/customTemplate", () => ({
  default: vi.fn().mockReturnValue({ text: "Custom SMS message" }),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/templates/smsReminderTemplate", () => ({
  default: vi.fn().mockReturnValue("Reminder: You have a meeting"),
}));

const mockSendSmsOrFallbackEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@calcom/features/ee/workflows/lib/reminders/messageDispatcher", () => ({
  sendSmsOrFallbackEmail: (...args: unknown[]) => mockSendSmsOrFallbackEmail(...args),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/utils", () => ({
  bulkShortenLinks: vi.fn().mockResolvedValue([
    { shortLink: "https://short.link/meet" },
    { shortLink: "https://short.link/cancel" },
    { shortLink: "https://short.link/reschedule" },
  ]),
}));

vi.mock("@calcom/features/ee/workflows/lib/service/workflowOptOutService", () => ({
  WorkflowOptOutService: {
    addOptOutMessage: vi.fn().mockResolvedValue("Message with opt-out"),
  },
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue(((key: string) => key) as any),
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  getTimeFormatStringFromUserTimeFormat: vi.fn().mockReturnValue("h:mma"),
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  bookingMetadataSchema: {
    parse: vi.fn().mockReturnValue({ videoCallUrl: "https://meet.example.com" }),
  },
}));

// --- Helpers ---

function createMockReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: "reminder-uuid-1",
    seatReferenceId: null,
    scheduledDate: new Date("2025-06-15T09:30:00Z"),
    workflowStep: {
      id: 10,
      action: WorkflowActions.SMS_ATTENDEE,
      sendTo: null,
      sender: "CalSender",
      reminderBody: "Hello {attendee_name}!",
      template: WorkflowTemplates.CUSTOM,
      verifiedAt: new Date("2025-01-01T00:00:00Z"),
      workflow: {
        userId: 1,
        teamId: null,
      },
    },
    booking: {
      uid: "booking-123",
      startTime: new Date("2025-06-15T10:00:00Z"),
      endTime: new Date("2025-06-15T11:00:00Z"),
      location: "https://meet.example.com",
      description: "Test meeting",
      metadata: {},
      user: {
        id: 1,
        name: "Organizer",
        email: "organizer@example.com",
        timeZone: "America/New_York",
        locale: "en",
        timeFormat: 12,
      },
      eventType: {
        title: "30 min meeting",
        bookingFields: null,
        team: null,
      },
      attendees: [
        {
          name: "Attendee",
          email: "attendee@example.com",
          phoneNumber: "+1234567890",
          timeZone: "America/New_York",
          locale: "en",
        },
      ],
    },
    ...overrides,
  };
}

// --- Tests ---

describe("ZSendWorkflowSMSSchema", () => {
  test("should validate correct payload", () => {
    const result = ZSendWorkflowSMSSchema.safeParse({
      bookingUid: "abc-123",
      workflowReminderId: 42,
    });
    expect(result.success).toBe(true);
  });

  test("should reject missing bookingUid", () => {
    const result = ZSendWorkflowSMSSchema.safeParse({
      workflowReminderId: 42,
    });
    expect(result.success).toBe(false);
  });

  test("should reject missing workflowReminderId", () => {
    const result = ZSendWorkflowSMSSchema.safeParse({
      bookingUid: "abc-123",
    });
    expect(result.success).toBe(false);
  });

  test("should reject non-number workflowReminderId", () => {
    const result = ZSendWorkflowSMSSchema.safeParse({
      bookingUid: "abc-123",
      workflowReminderId: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  test("should reject non-string bookingUid", () => {
    const result = ZSendWorkflowSMSSchema.safeParse({
      bookingUid: 123,
      workflowReminderId: 42,
    });
    expect(result.success).toBe(false);
  });
});

describe("sendWorkflowSMS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return early when reminder is not found", async () => {
    mockFindByIdForSMSTask.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).not.toHaveBeenCalled();
  });

  test("should return early when workflowStep is missing", async () => {
    mockFindByIdForSMSTask.mockResolvedValue({
      ...createMockReminder(),
      workflowStep: null,
    });

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).not.toHaveBeenCalled();
  });

  test("should return early when booking is missing", async () => {
    mockFindByIdForSMSTask.mockResolvedValue({
      ...createMockReminder(),
      booking: null,
    });

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).not.toHaveBeenCalled();
  });

  test("should send SMS for SMS_ATTENDEE action with custom template", async () => {
    const reminder = createMockReminder();
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null); // no org profile

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledTimes(1);
    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+1234567890",
          body: "Custom SMS message",
          sender: "CalSender",
          bookingUid: "booking-123",
          userId: 1,
          teamId: null,
        }),
        fallbackData: expect.objectContaining({
          email: "attendee@example.com",
        }),
        creditCheckFn: expect.any(Function),
      })
    );
  });

  test("should send SMS to specific number for SMS_NUMBER action", async () => {
    const reminder = createMockReminder({
      workflowStep: {
        id: 10,
        action: WorkflowActions.SMS_NUMBER,
        sendTo: "+9876543210",
        sender: "CalSender",
        reminderBody: "Hello!",
        template: WorkflowTemplates.CUSTOM,
        verifiedAt: new Date("2025-01-01T00:00:00Z"),
        workflow: { userId: 1, teamId: null },
      },
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+9876543210",
        }),
        // SMS_NUMBER should not have fallback data
        fallbackData: undefined,
      })
    );
  });

  test("should use REMINDER template when no custom reminderBody", async () => {
    const reminder = createMockReminder({
      workflowStep: {
        id: 10,
        action: WorkflowActions.SMS_ATTENDEE,
        sendTo: null,
        sender: "CalSender",
        reminderBody: null,
        template: WorkflowTemplates.REMINDER,
        verifiedAt: new Date("2025-01-01T00:00:00Z"),
        workflow: { userId: 1, teamId: null },
      },
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          body: "Reminder: You have a meeting",
        }),
      })
    );
  });

  test("should return early when message is empty", async () => {
    const reminder = createMockReminder({
      workflowStep: {
        id: 10,
        action: WorkflowActions.SMS_ATTENDEE,
        sendTo: null,
        sender: "CalSender",
        reminderBody: null,
        template: WorkflowTemplates.CUSTOM, // no body + not REMINDER template = null message
        verifiedAt: new Date("2025-01-01T00:00:00Z"),
        workflow: { userId: 1, teamId: null },
      },
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).not.toHaveBeenCalled();
  });

  test("should return early when sendTo is undefined", async () => {
    const reminder = createMockReminder();
    // Override attendees to have no phone number
    reminder.booking.attendees = [
      {
        name: "Attendee",
        email: "attendee@example.com",
        phoneNumber: undefined as unknown as string,
        timeZone: "America/New_York",
        locale: "en",
      },
    ];
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    // The message will be built but sendTo will be undefined, so no SMS sent
    expect(mockSendSmsOrFallbackEmail).not.toHaveBeenCalled();
  });

  test("should handle seat reference to find correct attendee", async () => {
    const reminder = createMockReminder({
      seatReferenceId: "seat-ref-123",
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    mockGetByReferenceUidWithAttendeeDetails.mockResolvedValue({
      attendee: {
        name: "Seated Attendee",
        email: "seated@example.com",
        phoneNumber: "+5555555555",
        timeZone: "Europe/London",
        locale: "en",
      },
    });

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockGetByReferenceUidWithAttendeeDetails).toHaveBeenCalledWith("seat-ref-123");
    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+5555555555",
        }),
      })
    );
  });

  test("should fallback to first attendee when seat reference returns no data", async () => {
    const reminder = createMockReminder({
      seatReferenceId: "seat-ref-missing",
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    mockGetByReferenceUidWithAttendeeDetails.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+1234567890", // Original first attendee's phone
        }),
      })
    );
  });

  test("should throw on invalid JSON payload", async () => {
    await expect(sendWorkflowSMS("not-valid-json")).rejects.toThrow();
  });

  test("should throw on invalid payload schema", async () => {
    await expect(
      sendWorkflowSMS(JSON.stringify({ invalid: "data" }))
    ).rejects.toThrow();
  });

  test("should include opt-out message", async () => {
    const reminder = createMockReminder();
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          bodyWithoutOptOut: "Message with opt-out",
        }),
      })
    );
  });

  test("should handle team workflow with teamId", async () => {
    const reminder = createMockReminder({
      workflowStep: {
        id: 10,
        action: WorkflowActions.SMS_ATTENDEE,
        sendTo: null,
        sender: "CalSender",
        reminderBody: "Team reminder",
        template: WorkflowTemplates.CUSTOM,
        verifiedAt: new Date("2025-01-01T00:00:00Z"),
        workflow: { userId: null, teamId: 42 },
      },
    });
    mockFindByIdForSMSTask.mockResolvedValue(reminder);
    mockFindFirst.mockResolvedValue(null);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          userId: null,
          teamId: 42,
        }),
      })
    );
  });

  test("should determine attendee vs organizer timezone based on action", async () => {
    // For SMS_ATTENDEE, timezone should be attendee's timezone
    const attendeeReminder = createMockReminder({
      workflowStep: {
        id: 10,
        action: WorkflowActions.SMS_ATTENDEE,
        sendTo: null,
        sender: "CalSender",
        reminderBody: null,
        template: WorkflowTemplates.REMINDER,
        verifiedAt: new Date("2025-01-01T00:00:00Z"),
        workflow: { userId: 1, teamId: null },
      },
    });
    attendeeReminder.booking.attendees[0].timeZone = "Asia/Tokyo";
    attendeeReminder.booking.user.timeZone = "America/New_York";

    mockFindByIdForSMSTask.mockResolvedValue(attendeeReminder);

    await sendWorkflowSMS(
      JSON.stringify({ bookingUid: "booking-123", workflowReminderId: 1 })
    );

    // The function should use attendee timezone for SMS_ATTENDEE
    expect(mockSendSmsOrFallbackEmail).toHaveBeenCalled();
  });
});
