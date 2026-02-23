import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { WorkflowActions, WorkflowMethods, WorkflowTemplates } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShortenMany = vi.fn();
vi.mock("@calcom/features/url-shortener/UrlShortenerFactory", () => ({
  UrlShortenerFactory: {
    create: () => ({
      shortenMany: (...args: unknown[]) => mockShortenMany(...args),
    }),
  },
}));

const mockScheduleSmsOrFallbackEmail = vi.fn();
vi.mock("@calcom/features/ee/workflows/lib/reminders/messageDispatcher", () => ({
  scheduleSmsOrFallbackEmail: (...args: unknown[]) => mockScheduleSmsOrFallbackEmail(...args),
}));

const mockHasAvailableCredits = vi.fn().mockResolvedValue(true);
vi.mock("@calcom/features/ee/billing/credit-service", () => {
  return {
    CreditService: class {
      hasAvailableCredits = mockHasAvailableCredits;
    },
  };
});

const mockGetByReferenceUid = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingSeatRepository", () => {
  return {
    BookingSeatRepository: class {
      getByReferenceUidWithAttendeeDetails = (...args: unknown[]) => mockGetByReferenceUid(...args);
    },
  };
});

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://app.cal.com"),
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn().mockReturnValue({ responses: {} }),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue(((key: string) => key) as unknown),
}));

vi.mock("@calcom/lib/constants", () => ({
  DUB_SMS_DOMAIN: "sms.example.com",
  DUB_SMS_FOLDER_ID: "folder-123",
}));

vi.mock("../lib/alphanumericSenderIdSupport", () => ({
  getSenderId: vi.fn().mockReturnValue("CalCom"),
}));

vi.mock("../lib/getWorkflowReminders", () => ({
  select: { id: true },
  getWorkflowRecipientEmail: vi.fn().mockReturnValue(null),
}));

const mockCustomTemplate = vi.fn().mockReturnValue({ text: "Custom SMS message", html: "" });
vi.mock("../lib/reminders/templates/customTemplate", () => ({
  default: (...args: unknown[]) => mockCustomTemplate(...args),
}));

const mockSmsReminderTemplate = vi.fn().mockReturnValue("Reminder: Your event is coming up");
vi.mock("../lib/reminders/templates/smsReminderTemplate", () => ({
  default: (...args: unknown[]) => mockSmsReminderTemplate(...args),
}));

const mockAddOptOutMessage = vi.fn().mockResolvedValue("message with opt-out footer");
vi.mock("../lib/service/workflowOptOutService", () => ({
  WorkflowOptOutService: {
    addOptOutMessage: (...args: unknown[]) => mockAddOptOutMessage(...args),
  },
}));

vi.mock("@calcom/features/ee/workflows/lib/actionHelperFunctions", () => ({
  isAttendeeAction: vi.fn(
    (action: string) =>
      action === "SMS_ATTENDEE" || action === "EMAIL_ATTENDEE" || action === "WHATSAPP_ATTENDEE"
  ),
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  bookingMetadataSchema: {
    parse: vi.fn((metadata: Record<string, unknown>) => metadata || {}),
  },
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  getTimeFormatStringFromUserTimeFormat: vi.fn().mockReturnValue("h:mma"),
}));

import { handler } from "./scheduleSMSReminders";

const MOCK_CRON_API_KEY = "test-cron-api-key-123";

function createMockRequest({
  apiKeyParam = MOCK_CRON_API_KEY,
  authorizationHeader,
  skipAuth = false,
}: {
  apiKeyParam?: string;
  authorizationHeader?: string;
  skipAuth?: boolean;
} = {}) {
  const url = new URL("https://app.cal.com/api/workflows/scheduleSMSReminders");
  if (!skipAuth && !authorizationHeader && apiKeyParam) {
    url.searchParams.set("apiKey", apiKeyParam);
  }
  const headers = new Headers();
  if (authorizationHeader) {
    headers.set("authorization", authorizationHeader);
  }
  return {
    headers: {
      get: (name: string) => headers.get(name),
    },
    nextUrl: url,
  };
}

function buildMockReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    scheduledDate: new Date("2025-06-15T10:00:00Z"),
    isMandatoryReminder: false,
    uuid: "uuid-123",
    seatReferenceId: null,
    retryCount: 0,
    workflowStep: {
      action: WorkflowActions.SMS_ATTENDEE,
      sendTo: "+15559876543",
      reminderBody: "Hello {ATTENDEE_NAME}, your event {EVENT_NAME} is coming up!",
      emailSubject: null,
      template: WorkflowTemplates.CUSTOM,
      sender: "CalCom",
      includeCalendarEvent: false,
      id: 10,
      workflow: {
        userId: 1,
        teamId: null,
      },
    },
    booking: {
      startTime: new Date("2025-06-15T10:00:00Z"),
      endTime: new Date("2025-06-15T11:00:00Z"),
      location: "https://meet.google.com/test",
      description: "Test meeting",
      smsReminderNumber: "+15551234567",
      userPrimaryEmail: "organizer@example.com",
      metadata: {},
      uid: "booking-uid-123",
      customInputs: {},
      responses: {},
      title: "Test Event",
      attendees: [
        {
          name: "Test Attendee",
          email: "attendee@example.com",
          phoneNumber: "+15551234567",
          timeZone: "America/New_York",
          locale: "en",
        },
      ],
      user: {
        id: 1,
        email: "organizer@example.com",
        name: "Test Organizer",
        timeZone: "Europe/London",
        locale: "en",
        username: "organizer",
        timeFormat: 12,
        hideBranding: false,
      },
      eventType: {
        bookingFields: null,
        title: "Test Event",
        slug: "test-event",
        hosts: [],
        recurringEvent: null,
        team: { parentId: null, hideBranding: false },
        customReplyToEmail: null,
      },
    },
    ...overrides,
  };
}

describe("scheduleSMSReminders handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("CRON_API_KEY", MOCK_CRON_API_KEY);
    mockShortenMany.mockResolvedValue([
      { shortLink: "https://short.link/meet" },
      { shortLink: "https://short.link/cancel" },
      { shortLink: "https://short.link/reschedule" },
    ]);
    mockCustomTemplate.mockReturnValue({ text: "Custom SMS message", html: "" });
    mockSmsReminderTemplate.mockReturnValue("Reminder: Your event is coming up");
    mockAddOptOutMessage.mockResolvedValue("message with opt-out footer");
    mockScheduleSmsOrFallbackEmail.mockResolvedValue({ sid: "SM123456", emailReminderId: null });
    prismaMock.profile.findFirst.mockResolvedValue(null);
  });

  describe("authentication", () => {
    it("returns 401 when no apiKey is provided", async () => {
      const req = createMockRequest({ skipAuth: true });

      const response = await handler(req as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.message).toBe("Not authenticated");
    });

    it("returns 401 when apiKey does not match CRON_API_KEY", async () => {
      const req = createMockRequest({ apiKeyParam: "wrong-key" });

      const response = await handler(req as any);

      expect(response.status).toBe(401);
    });

    it("authenticates via authorization header", async () => {
      const req = createMockRequest({ skipAuth: true, authorizationHeader: MOCK_CRON_API_KEY });
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      const response = await handler(req as any);

      expect(response.status).toBe(200);
    });

    it("authenticates via query parameter", async () => {
      const req = createMockRequest({ apiKeyParam: MOCK_CRON_API_KEY });
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      const response = await handler(req as any);

      expect(response.status).toBe(200);
    });
  });

  describe("no reminders found", () => {
    it("returns ok when no unscheduled reminders exist", async () => {
      const req = createMockRequest();
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      const response = await handler(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
    });

    it("queries with correct filters", async () => {
      const req = createMockRequest();
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      await handler(req as any);

      const callArgs = prismaMock.workflowReminder.findMany.mock.calls[0][0];
      expect(callArgs.where.method).toBe(WorkflowMethods.SMS);
      expect(callArgs.where.scheduled).toBe(false);
      expect(callArgs.where.scheduledDate).toEqual(
        expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(String),
        })
      );
      expect(callArgs.where.retryCount).toEqual({ lt: 3 });
    });
  });

  describe("skipping invalid reminders", () => {
    it("skips when workflowStep is null", async () => {
      const req = createMockRequest();
      const invalidReminder = buildMockReminder({ workflowStep: null });
      prismaMock.workflowReminder.findMany.mockResolvedValue([invalidReminder as any]);

      const response = await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("skips when booking is null", async () => {
      const req = createMockRequest();
      const invalidReminder = buildMockReminder({ booking: null });
      prismaMock.workflowReminder.findMany.mockResolvedValue([invalidReminder as any]);

      const response = await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("continues processing valid reminders after skipping invalid ones", async () => {
      const req = createMockRequest();
      const invalidReminder = buildMockReminder({ id: 1, workflowStep: null });
      const validReminder = buildMockReminder({ id: 2 });
      prismaMock.workflowReminder.findMany.mockResolvedValue([invalidReminder as any, validReminder as any]);

      await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("seated events", () => {
    it("looks up seat attendee when seatReferenceId is present", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ seatReferenceId: "seat-ref-123" });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockGetByReferenceUid.mockResolvedValue({
        attendee: {
          name: "Seat Attendee",
          email: "seat@example.com",
          phoneNumber: "+15559999999",
          timeZone: "US/Pacific",
          locale: "en",
        },
      });

      await handler(req as any);

      expect(mockGetByReferenceUid).toHaveBeenCalledWith("seat-ref-123");
    });

    it("uses seat attendee data when found", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ seatReferenceId: "seat-ref-123" });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockGetByReferenceUid.mockResolvedValue({
        attendee: {
          name: "Seat Attendee",
          email: "seat@example.com",
          phoneNumber: "+15559999999",
          timeZone: "US/Pacific",
          locale: "en",
        },
      });

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.twilioData.phoneNumber).toBe("+15559999999");
    });

    it("falls back to booking attendee when seat lookup returns null", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ seatReferenceId: "seat-ref-123" });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockGetByReferenceUid.mockResolvedValue(null);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.twilioData.phoneNumber).toBe("+15551234567");
    });

    it("does not query seat repository when seatReferenceId is null", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ seatReferenceId: null });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(mockGetByReferenceUid).not.toHaveBeenCalled();
    });
  });

  describe("action-based field selection", () => {
    it("uses workflowStep.sendTo for SMS_NUMBER action", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({
        workflowStep: {
          ...buildMockReminder().workflowStep,
          action: WorkflowActions.SMS_NUMBER,
          sendTo: "+15559876543",
        },
      });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.twilioData.phoneNumber).toBe("+15559876543");
    });

    it("uses targetAttendee.phoneNumber for SMS_ATTENDEE action", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.twilioData.phoneNumber).toBe("+15551234567");
    });
  });

  describe("custom reminderBody processing", () => {
    it("shortens meetingUrl, cancelLink, and rescheduleLink", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const [urls] = mockShortenMany.mock.calls[0];
      expect(urls).toHaveLength(3);
      expect(urls[1]).toContain("/booking/booking-uid-123?cancel=true");
      expect(urls[2]).toContain("/reschedule/booking-uid-123");
    });

    it("passes shortened URLs to customTemplate variables", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const variables = mockCustomTemplate.mock.calls[0][1];
      expect(variables.meetingUrl).toBe("https://short.link/meet");
      expect(variables.cancelLink).toBe("https://short.link/cancel");
      expect(variables.rescheduleLink).toBe("https://short.link/reschedule");
    });

    it("fetches organizer profile for booker URL", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(prismaMock.profile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
        })
      );
    });

    it("falls back to 'en' locale when computed locale is null", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      (reminder.booking as any).attendees[0].locale = null;
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const templateLocale = mockCustomTemplate.mock.calls[0][2];
      expect(templateLocale).toBe("en");
    });
  });

  describe("REMINDER template processing", () => {
    it("uses smsReminderTemplate when no reminderBody and template is REMINDER", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({
        workflowStep: {
          ...buildMockReminder().workflowStep,
          reminderBody: null,
          template: WorkflowTemplates.REMINDER,
        },
      });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(mockSmsReminderTemplate).toHaveBeenCalled();
      expect(mockCustomTemplate).not.toHaveBeenCalled();
    });

    it("does not send SMS when neither reminderBody nor REMINDER template", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({
        workflowStep: {
          ...buildMockReminder().workflowStep,
          reminderBody: null,
          template: WorkflowTemplates.CUSTOM,
        },
      });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).not.toHaveBeenCalled();
    });
  });

  describe("SMS sending and DB updates", () => {
    it("calls addOptOutMessage before sending", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(mockAddOptOutMessage).toHaveBeenCalled();
    });

    it("calls scheduleSmsOrFallbackEmail with correct twilioData", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.twilioData).toMatchObject({
        phoneNumber: "+15551234567",
        scheduledDate: reminder.scheduledDate,
        sender: "CalCom",
        bookingUid: "booking-uid-123",
        userId: 1,
        teamId: null,
      });
      expect(callArgs.twilioData.body).toBeDefined();
      expect(callArgs.twilioData.bodyWithoutOptOut).toBeDefined();
    });

    it("includes fallbackData for attendee actions", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.fallbackData).toBeDefined();
      expect(callArgs.fallbackData.email).toBe("attendee@example.com");
      expect(callArgs.fallbackData.replyTo).toBe("organizer@example.com");
      expect(callArgs.fallbackData.workflowStepId).toBe(10);
    });

    it("does not include fallbackData for non-attendee actions", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({
        workflowStep: {
          ...buildMockReminder().workflowStep,
          action: WorkflowActions.SMS_NUMBER,
        },
      });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      const callArgs = mockScheduleSmsOrFallbackEmail.mock.calls[0][0];
      expect(callArgs.fallbackData).toBeUndefined();
    });

    it("updates reminder to scheduled=true with SID on success", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockScheduleSmsOrFallbackEmail.mockResolvedValue({ sid: "SM123456", emailReminderId: null });

      await handler(req as any);

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scheduled: true, referenceId: "SM123456" },
      });
    });

    it("deletes SMS reminder when email fallback was used", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockScheduleSmsOrFallbackEmail.mockResolvedValue({ sid: null, emailReminderId: 456 });

      await handler(req as any);

      expect(prismaMock.workflowReminder.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("increments retryCount when scheduleSmsOrFallbackEmail returns null", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ retryCount: 1 });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockScheduleSmsOrFallbackEmail.mockResolvedValue(null);

      await handler(req as any);

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retryCount: 2 },
      });
    });

    it("does not send when sendTo is undefined", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      (reminder.booking as any).attendees[0].phoneNumber = undefined;
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("increments retryCount on caught exception", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder({ retryCount: 0 });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);
      mockScheduleSmsOrFallbackEmail.mockRejectedValue(new Error("Twilio error"));

      await handler(req as any);

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retryCount: 1 },
      });
    });

    it("continues processing after one reminder fails", async () => {
      const req = createMockRequest();
      const failingReminder = buildMockReminder({ id: 1, retryCount: 0 });
      const successReminder = buildMockReminder({ id: 2, retryCount: 0 });
      prismaMock.workflowReminder.findMany.mockResolvedValue([
        failingReminder as any,
        successReminder as any,
      ]);
      mockScheduleSmsOrFallbackEmail
        .mockRejectedValueOnce(new Error("Twilio error"))
        .mockResolvedValueOnce({ sid: "SM789", emailReminderId: null });

      const response = await handler(req as any);

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { retryCount: 1 },
      });
      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { scheduled: true, referenceId: "SM789" },
      });
      expect(response.status).toBe(200);
    });

    it("returns 200 with message after processing all reminders", async () => {
      const req = createMockRequest();
      const reminder = buildMockReminder();
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder as any]);

      const response = await handler(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe("SMS scheduled");
    });
  });

  describe("multiple reminders", () => {
    it("processes each reminder independently", async () => {
      const req = createMockRequest();
      const reminder1 = buildMockReminder({ id: 1 });
      const reminder2 = buildMockReminder({
        id: 2,
        workflowStep: {
          ...buildMockReminder().workflowStep,
          action: WorkflowActions.SMS_NUMBER,
          sendTo: "+15559876543",
          reminderBody: null,
          template: WorkflowTemplates.REMINDER,
        },
      });
      prismaMock.workflowReminder.findMany.mockResolvedValue([reminder1 as any, reminder2 as any]);

      await handler(req as any);

      expect(mockScheduleSmsOrFallbackEmail).toHaveBeenCalledTimes(2);
    });
  });
});
