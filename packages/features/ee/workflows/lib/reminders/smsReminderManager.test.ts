import { describe, expect, vi, beforeEach } from "vitest";

import { WorkflowActions, WorkflowMethods, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

// --- Mocks ---

const mockCancelSMS = vi.fn();
vi.mock("./providers/twilioProvider", () => ({
  cancelSMS: (...args: unknown[]) => mockCancelSMS(...args),
}));

const mockCancelWithReference = vi.fn();
const mockTaskerCreate = vi.fn();
vi.mock("@calcom/features/tasker", () => ({
  default: {
    cancelWithReference: (...args: unknown[]) => mockCancelWithReference(...args),
    create: (...args: unknown[]) => mockTaskerCreate(...args),
  },
}));

const mockPrismaWorkflowReminderDelete = vi.fn();
const mockPrismaWorkflowReminderCreate = vi.fn();
const mockPrismaWorkflowReminderFindUnique = vi.fn();
const mockPrismaVerifiedNumberFindFirst = vi.fn();

vi.mock("@calcom/prisma", () => ({
  default: {
    workflowReminder: {
      delete: (...args: unknown[]) => mockPrismaWorkflowReminderDelete(...args),
      create: (...args: unknown[]) => mockPrismaWorkflowReminderCreate(...args),
      findUnique: (...args: unknown[]) => mockPrismaWorkflowReminderFindUnique(...args),
    },
    verifiedNumber: {
      findFirst: (...args: unknown[]) => mockPrismaVerifiedNumberFindFirst(...args),
    },
  },
  prisma: {
    workflowReminder: {
      delete: (...args: unknown[]) => mockPrismaWorkflowReminderDelete(...args),
      create: (...args: unknown[]) => mockPrismaWorkflowReminderCreate(...args),
      findUnique: (...args: unknown[]) => mockPrismaWorkflowReminderFindUnique(...args),
    },
    verifiedNumber: {
      findFirst: (...args: unknown[]) => mockPrismaVerifiedNumberFindFirst(...args),
    },
  },
}));

vi.mock("@calcom/ee/workflows/lib/reminders/utils", () => ({
  getAttendeeToBeUsedInSMS: vi.fn().mockReturnValue({
    name: "Attendee",
    email: "attendee@example.com",
    timeZone: "UTC",
    language: { locale: "en" },
  }),
  getSMSMessageWithVariables: vi.fn().mockResolvedValue("Processed message"),
  shouldUseTwilio: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/lib/constants", () => ({
  SENDER_ID: "Cal.com",
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn((obj: unknown) => JSON.stringify(obj)),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue(((key: string) => key) as any),
}));

vi.mock("../actionHelperFunctions", () => ({
  isAttendeeAction: vi.fn().mockReturnValue(false),
}));

vi.mock("../alphanumericSenderIdSupport", () => ({
  getSenderId: vi.fn().mockReturnValue("CalSender"),
}));

vi.mock("../repository/workflowOptOutContact", () => ({
  WorkflowOptOutContactRepository: {
    isOptedOut: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("../service/workflowOptOutService", () => ({
  WorkflowOptOutService: {
    addOptOutMessage: vi.fn().mockResolvedValue("Message with opt-out"),
  },
}));

vi.mock("./messageDispatcher", () => ({
  scheduleSmsOrFallbackEmail: vi.fn().mockResolvedValue(null),
  sendSmsOrFallbackEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./templates/customTemplate", () => ({
  default: vi.fn().mockReturnValue({ text: "Custom message" }),
  transformRoutingFormResponsesToVariableFormat: vi.fn().mockReturnValue({}),
}));

vi.mock("./templates/smsReminderTemplate", () => ({
  default: vi.fn().mockReturnValue("Reminder message"),
}));

vi.mock("@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/formSubmissionValidation", () => ({
  getSubmitterEmail: vi.fn().mockReturnValue("submitter@example.com"),
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  getTimeFormatStringFromUserTimeFormat: vi.fn().mockReturnValue("h:mma"),
}));

describe("deleteScheduledSMSReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should cancel via Twilio when referenceId is provided", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockCancelSMS.mockResolvedValue(undefined);
    mockPrismaWorkflowReminderDelete.mockResolvedValue({});

    await deleteScheduledSMSReminder(1, "twilio-sid-123");

    expect(mockCancelSMS).toHaveBeenCalledWith("twilio-sid-123");
    expect(mockCancelWithReference).not.toHaveBeenCalled();
    expect(mockPrismaWorkflowReminderDelete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  test("should cancel via tasker when referenceId is null and uuid exists", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockPrismaWorkflowReminderFindUnique.mockResolvedValue({
      uuid: "tasker-uuid-456",
    });
    mockCancelWithReference.mockResolvedValue("cancelled");
    mockPrismaWorkflowReminderDelete.mockResolvedValue({});

    await deleteScheduledSMSReminder(2, null);

    expect(mockCancelSMS).not.toHaveBeenCalled();
    expect(mockPrismaWorkflowReminderFindUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { uuid: true },
    });
    expect(mockCancelWithReference).toHaveBeenCalledWith("tasker-uuid-456", "sendWorkflowSMS");
    expect(mockPrismaWorkflowReminderDelete).toHaveBeenCalledWith({
      where: { id: 2 },
    });
  });

  test("should not cancel via tasker when referenceId is null and uuid is missing", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockPrismaWorkflowReminderFindUnique.mockResolvedValue({
      uuid: null,
    });
    mockPrismaWorkflowReminderDelete.mockResolvedValue({});

    await deleteScheduledSMSReminder(3, null);

    expect(mockCancelWithReference).not.toHaveBeenCalled();
    expect(mockPrismaWorkflowReminderDelete).toHaveBeenCalledWith({
      where: { id: 3 },
    });
  });

  test("should not cancel via tasker when reminder not found", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockPrismaWorkflowReminderFindUnique.mockResolvedValue(null);
    mockPrismaWorkflowReminderDelete.mockResolvedValue({});

    await deleteScheduledSMSReminder(4, null);

    expect(mockCancelWithReference).not.toHaveBeenCalled();
    expect(mockPrismaWorkflowReminderDelete).toHaveBeenCalledWith({
      where: { id: 4 },
    });
  });

  test("should handle error gracefully in Twilio cancel", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockCancelSMS.mockRejectedValue(new Error("Twilio error"));

    // Should not throw
    await deleteScheduledSMSReminder(5, "bad-sid");

    // Delete should still not be called because error was caught before
    expect(mockPrismaWorkflowReminderDelete).not.toHaveBeenCalled();
  });

  test("should handle error gracefully in tasker cancel", async () => {
    const { deleteScheduledSMSReminder } = await import("./smsReminderManager");

    mockPrismaWorkflowReminderFindUnique.mockResolvedValue({ uuid: "uuid-error" });
    mockCancelWithReference.mockRejectedValue(new Error("Tasker error"));

    // Should not throw
    await deleteScheduledSMSReminder(6, null);
  });
});

describe("scheduleSMSReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return early if verifiedAt is null", async () => {
    const { scheduleSMSReminder } = await import("./smsReminderManager");

    await scheduleSMSReminder({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: { time: 30, timeUnit: "MINUTE" },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: null,
      creditCheckFn: vi.fn(),
      reminderPhone: "+1234567890",
      message: "Hello",
      action: WorkflowActions.SMS_ATTENDEE,
      evt: {
        uid: "booking-1",
        startTime: "2025-06-15T10:00:00Z",
        endTime: "2025-06-15T11:00:00Z",
        title: "Test",
        attendees: [
          {
            email: "a@b.com",
            name: "A",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        organizer: {
          email: "o@b.com",
          name: "O",
          timeZone: "UTC",
          language: { locale: "en" },
          timeFormat: 12,
        },
      } as any,
    });

    // Should not proceed to any SMS sending/scheduling
    expect(mockPrismaWorkflowReminderCreate).not.toHaveBeenCalled();
  });

  test("should return early if reminderPhone is null", async () => {
    const { scheduleSMSReminder } = await import("./smsReminderManager");

    await scheduleSMSReminder({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: { time: 30, timeUnit: "MINUTE" },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn(),
      reminderPhone: null,
      message: "Hello",
      action: WorkflowActions.SMS_ATTENDEE,
      evt: {
        uid: "booking-1",
        startTime: "2025-06-15T10:00:00Z",
        endTime: "2025-06-15T11:00:00Z",
        title: "Test",
        attendees: [
          {
            email: "a@b.com",
            name: "A",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        organizer: {
          email: "o@b.com",
          name: "O",
          timeZone: "UTC",
          language: { locale: "en" },
          timeFormat: 12,
        },
      } as any,
    });

    expect(mockPrismaWorkflowReminderCreate).not.toHaveBeenCalled();
  });

  test("should return early if phone is opted out", async () => {
    const { scheduleSMSReminder } = await import("./smsReminderManager");

    // Override opt-out mock for this test
    const { WorkflowOptOutContactRepository } = await import("../repository/workflowOptOutContact");
    vi.mocked(WorkflowOptOutContactRepository.isOptedOut).mockResolvedValueOnce(true);

    await scheduleSMSReminder({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: { time: 30, timeUnit: "MINUTE" },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn(),
      reminderPhone: "+1234567890",
      message: "Hello",
      action: WorkflowActions.SMS_ATTENDEE,
      evt: {
        uid: "booking-1",
        startTime: "2025-06-15T10:00:00Z",
        endTime: "2025-06-15T11:00:00Z",
        title: "Test",
        attendees: [
          {
            email: "a@b.com",
            name: "A",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        organizer: {
          email: "o@b.com",
          name: "O",
          timeZone: "UTC",
          language: { locale: "en" },
          timeFormat: 12,
        },
      } as any,
    });

    expect(mockPrismaWorkflowReminderCreate).not.toHaveBeenCalled();
  });

  test("should skip SMS_NUMBER action if phone is not verified", async () => {
    const { scheduleSMSReminder } = await import("./smsReminderManager");

    // No verified number found
    mockPrismaVerifiedNumberFindFirst.mockResolvedValue(null);

    await scheduleSMSReminder({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: { time: 30, timeUnit: "MINUTE" },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn(),
      reminderPhone: "+1234567890",
      message: "Hello",
      action: WorkflowActions.SMS_NUMBER,
      isVerificationPending: false,
      evt: {
        uid: "booking-1",
        startTime: "2025-06-15T10:00:00Z",
        endTime: "2025-06-15T11:00:00Z",
        title: "Test",
        attendees: [
          {
            email: "a@b.com",
            name: "A",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        organizer: {
          email: "o@b.com",
          name: "O",
          timeZone: "UTC",
          language: { locale: "en" },
          timeFormat: 12,
        },
      } as any,
    });

    expect(mockPrismaWorkflowReminderCreate).not.toHaveBeenCalled();
  });

  test("should allow SMS_ATTENDEE without phone verification", async () => {
    const { scheduleSMSReminder } = await import("./smsReminderManager");

    // SMS_ATTENDEE does not need verification
    await scheduleSMSReminder({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: { time: 30, timeUnit: "MINUTE" },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt: new Date(),
      creditCheckFn: vi.fn(),
      reminderPhone: "+1234567890",
      message: "Hello",
      action: WorkflowActions.SMS_ATTENDEE,
      isVerificationPending: false,
      evt: {
        uid: "booking-1",
        startTime: "2025-06-15T10:00:00Z",
        endTime: "2025-06-15T11:00:00Z",
        title: "Test",
        attendees: [
          {
            email: "a@b.com",
            name: "A",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        organizer: {
          email: "o@b.com",
          name: "O",
          timeZone: "UTC",
          language: { locale: "en" },
          timeFormat: 12,
        },
      } as any,
    });

    // SMS_ATTENDEE bypasses phone verification, so it should proceed
    // (no assertion on create because `shouldUseTwilio` returns false in our mock)
    expect(mockPrismaVerifiedNumberFindFirst).not.toHaveBeenCalled();
  });
});
