import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";

import { handler } from "./scheduleWhatsappReminders";

const mockScheduleSmsOrFallbackEmail = vi.fn();
vi.mock("@calcom/features/ee/workflows/lib/reminders/messageDispatcher", () => ({
  scheduleSmsOrFallbackEmail: (...args: unknown[]) => mockScheduleSmsOrFallbackEmail(...args),
}));

vi.mock("@calcom/features/ee/billing/credit-service", () => {
  return {
    CreditService: class MockCreditService {
      hasAvailableCredits = vi.fn().mockResolvedValue(true);
    },
  };
});

vi.mock("@calcom/features/bookings/repositories/BookingSeatRepository", () => {
  return {
    BookingSeatRepository: class MockBookingSeatRepository {
      getByReferenceUidWithAttendeeDetails = vi.fn().mockResolvedValue(null);
    },
  };
});

vi.mock("@calcom/features/ee/workflows/lib/actionHelperFunctions", () => ({
  getWhatsappTemplateFunction: vi.fn().mockReturnValue(() => "Test WhatsApp message"),
  isAttendeeAction: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/templates/whatsapp/ContentSidMapping", () => ({
  getContentSidForTemplate: vi.fn().mockReturnValue("content-sid"),
  getContentVariablesForTemplate: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

function createMockNextRequest(): { headers: { get: (key: string) => string | null }; nextUrl: { searchParams: { get: (key: string) => string | null } } } {
  return {
    headers: {
      get: (key: string) => (key === "authorization" ? "test-api-key" : null),
    },
    nextUrl: {
      searchParams: {
        get: () => null,
      },
    },
  };
}

function createMockReminder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date();
  const scheduledDate = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    id: 1,
    scheduledDate,
    isMandatoryReminder: false,
    uuid: "test-uuid",
    seatReferenceId: null,
    workflowStep: {
      action: WorkflowActions.WHATSAPP_ATTENDEE,
      sendTo: null,
      reminderBody: null,
      emailSubject: null,
      template: WorkflowTemplates.REMINDER,
      sender: null,
      includeCalendarEvent: false,
      workflow: {
        userId: 1,
        teamId: null,
      },
    },
    booking: {
      startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      location: "https://meet.google.com/test",
      description: "Test booking",
      metadata: {},
      customInputs: {},
      responses: {},
      uid: "booking-uid-123",
      userPrimaryEmail: "organizer@example.com",
      smsReminderNumber: null,
      title: "Test Meeting",
      attendees: [
        {
          name: "Attendee One",
          email: "attendee@example.com",
          phoneNumber: "+1111111111",
          timeZone: "America/New_York",
          locale: "en",
        },
      ],
      eventType: {
        bookingFields: null,
        title: "Test Event",
        slug: "test-event",
        hosts: [],
        recurringEvent: null,
        team: { parentId: null, hideBranding: false },
        customReplyToEmail: null,
      },
      user: {
        id: 1,
        email: "organizer@example.com",
        name: "Organizer",
        timeZone: "America/New_York",
        locale: "en",
        username: "organizer",
        timeFormat: 12,
        hideBranding: false,
      },
    },
    ...overrides,
  };
}

describe("scheduleWhatsappReminders handler - smsReminderNumber fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_API_KEY = "test-api-key";
    mockScheduleSmsOrFallbackEmail.mockResolvedValue({ sid: "SM123", emailReminderId: null });
    prismaMock.workflowReminder.update.mockResolvedValue({} as never);
  });

  it("should use attendee phone when booking has no smsReminderNumber", async () => {
    const reminder = createMockReminder();
    prismaMock.workflowReminder.findMany.mockResolvedValue([reminder] as never);

    const req = createMockNextRequest();
    await handler(req as never);

    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledTimes(1);
    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+1111111111",
        }),
      })
    );
  });

  it("should use smsReminderNumber when booking has it set", async () => {
    const reminder = createMockReminder({
      booking: {
        ...createMockReminder().booking,
        smsReminderNumber: "+2222222222",
      },
    });
    prismaMock.workflowReminder.findMany.mockResolvedValue([reminder] as never);

    const req = createMockNextRequest();
    await handler(req as never);

    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledTimes(1);
    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+2222222222",
        }),
      })
    );
  });

  it("should prefer smsReminderNumber over attendee phone for non-seated events", async () => {
    const baseReminder = createMockReminder();
    const booking = baseReminder.booking as Record<string, unknown>;
    const reminder = createMockReminder({
      booking: {
        ...booking,
        smsReminderNumber: "+3333333333",
        attendees: [
          {
            name: "Attendee",
            email: "attendee@example.com",
            phoneNumber: "+1111111111",
            timeZone: "America/New_York",
            locale: "en",
          },
        ],
      },
    });
    prismaMock.workflowReminder.findMany.mockResolvedValue([reminder] as never);

    const req = createMockNextRequest();
    await handler(req as never);

    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+3333333333",
        }),
      })
    );
  });

  it("should use workflowStep.sendTo when action is WHATSAPP_NUMBER", async () => {
    const baseReminder = createMockReminder();
    const ws = baseReminder.workflowStep as Record<string, unknown>;
    const reminder = createMockReminder({
      workflowStep: {
        ...ws,
        action: WorkflowActions.WHATSAPP_NUMBER,
        sendTo: "+4444444444",
      },
      booking: {
        ...(baseReminder.booking as Record<string, unknown>),
        smsReminderNumber: "+2222222222",
      },
    });
    prismaMock.workflowReminder.findMany.mockResolvedValue([reminder] as never);

    const req = createMockNextRequest();
    await handler(req as never);

    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+4444444444",
        }),
      })
    );
  });

  it("should use smsReminderNumber when attendee has no phone number", async () => {
    const baseReminder = createMockReminder();
    const booking = baseReminder.booking as Record<string, unknown>;
    const reminder = createMockReminder({
      booking: {
        ...booking,
        smsReminderNumber: "+5555555555",
        attendees: [
          {
            name: "Attendee",
            email: "attendee@example.com",
            phoneNumber: null,
            timeZone: "America/New_York",
            locale: "en",
          },
        ],
      },
    });
    prismaMock.workflowReminder.findMany.mockResolvedValue([reminder] as never);

    const req = createMockNextRequest();
    await handler(req as never);

    expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        twilioData: expect.objectContaining({
          phoneNumber: "+5555555555",
        }),
      })
    );
  });

  it("should return early with ok:true when no unscheduled reminders exist", async () => {
    prismaMock.workflowReminder.findMany.mockResolvedValue([] as never);

    const req = createMockNextRequest();
    const response = await handler(req as never);
    const body = await response.json();

    expect(body).toEqual({ ok: true });
    expect(mockScheduleSmsOrFallbackEmail).not.toHaveBeenCalled();
  });
});
