import { describe, expect, vi, beforeEach } from "vitest";

import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

// Mock the dependencies used inside reminderScheduler
vi.mock("@calcom/features/bookings/repositories/BookingSeatRepository");
vi.mock("@calcom/features/ee/workflows/lib/service/EmailWorkflowService");
vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService");
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository");
vi.mock("@calcom/lib/formatCalendarEvent", () => ({
  formatCalEventExtended: vi.fn((evt: unknown) => evt),
}));
vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: unknown) => fn),
}));
vi.mock("@calcom/lib/server/i18n");
vi.mock("@calcom/lib/smsLockState", () => ({
  checkSMSRateLimit: vi.fn(),
}));
vi.mock("@calcom/prisma", () => ({
  prisma: {},
  default: {},
}));
vi.mock("./smsReminderManager", () => ({
  scheduleSMSReminder: vi.fn(),
}));
vi.mock("./emailReminderManager", () => ({
  scheduleEmailReminder: vi.fn(),
}));
vi.mock("./whatsappReminderManager", () => ({
  scheduleWhatsappReminder: vi.fn(),
}));

const mockScheduleLazySMSWorkflow = vi.mocked(WorkflowService.scheduleLazySMSWorkflow);
const mockScheduleLazyEmailWorkflow = vi.mocked(WorkflowService.scheduleLazyEmailWorkflow);

/**
 * Tests for the lazy SMS scheduling path in _scheduleWorkflowReminders.
 * This verifies that when BEFORE_EVENT/AFTER_EVENT + SMS action, the code
 * routes through WorkflowService.scheduleLazySMSWorkflow (the tasker path)
 * rather than the direct scheduleSMSReminder path.
 */
describe("_scheduleWorkflowReminders: SMS lazy scheduling via tasker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleLazySMSWorkflow.mockResolvedValue(undefined);
    mockScheduleLazyEmailWorkflow.mockResolvedValue(undefined);
  });

  const createMockCalendarEvent = (uid = "test-booking-uid") => ({
    uid,
    startTime: new Date("2025-06-15T10:00:00Z"),
    endTime: new Date("2025-06-15T11:00:00Z"),
    title: "Test Event",
    type: "test-event",
    description: "",
    attendees: [
      {
        email: "attendee@example.com",
        name: "Attendee",
        timeZone: "America/New_York",
        language: { locale: "en" },
      },
    ],
    organizer: {
      email: "organizer@example.com",
      name: "Organizer",
      timeZone: "America/New_York",
      language: { locale: "en" },
    },
    location: "",
    destinationCalendar: null,
  });

  const baseSmsStep = {
    id: 100,
    action: WorkflowActions.SMS_ATTENDEE,
    sendTo: null,
    reminderBody: "Reminder text",
    emailSubject: null,
    template: WorkflowTemplates.CUSTOM,
    verifiedAt: new Date(),
    includeCalendarEvent: false,
    numberVerificationPending: false,
    numberRequired: false,
    sender: null,
  };

  const baseEmailStep = {
    id: 200,
    action: WorkflowActions.EMAIL_ATTENDEE,
    sendTo: null,
    reminderBody: "Email reminder",
    emailSubject: "Subject",
    template: WorkflowTemplates.REMINDER,
    verifiedAt: new Date(),
    includeCalendarEvent: false,
    numberVerificationPending: false,
    numberRequired: false,
    sender: null,
  };

  test("should route BEFORE_EVENT + SMS_ATTENDEE through scheduleLazySMSWorkflow", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 1,
        name: "Before Event SMS",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [baseSmsStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledWith({
      evt: calendarEvent,
      workflowStepId: 100,
      workflowTriggerEvent: "BEFORE_EVENT",
      workflow: workflows[0],
      seatReferenceId: undefined,
    });
  });

  test("should route AFTER_EVENT + SMS_NUMBER through scheduleLazySMSWorkflow", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const smsNumberStep = {
      ...baseSmsStep,
      id: 101,
      action: WorkflowActions.SMS_NUMBER,
      sendTo: "+9876543210",
    };

    const workflows = [
      {
        id: 2,
        name: "After Event SMS Number",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.AFTER_EVENT,
        time: 1,
        timeUnit: TimeUnit.HOUR,
        steps: [smsNumberStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: null,
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledWith({
      evt: calendarEvent,
      workflowStepId: 101,
      workflowTriggerEvent: "AFTER_EVENT",
      workflow: workflows[0],
      seatReferenceId: undefined,
    });
  });

  test("should route BEFORE_EVENT + EMAIL through scheduleLazyEmailWorkflow (not SMS)", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 3,
        name: "Before Event Email",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 24,
        timeUnit: TimeUnit.HOUR,
        steps: [baseEmailStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: null,
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    // Email should go through scheduleLazyEmailWorkflow
    expect(mockScheduleLazyEmailWorkflow).toHaveBeenCalled();
    // SMS should NOT be called for email actions
    expect(mockScheduleLazySMSWorkflow).not.toHaveBeenCalled();
  });

  test("should handle mixed steps - email lazy + SMS lazy in same workflow", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 4,
        name: "Mixed Before Event",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 1,
        timeUnit: TimeUnit.HOUR,
        steps: [baseEmailStep, baseSmsStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    // Both lazy paths should be called
    expect(mockScheduleLazyEmailWorkflow).toHaveBeenCalledTimes(1);
    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledTimes(1);
  });

  test("should NOT route NEW_EVENT + SMS through lazy scheduling", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 5,
        name: "New Event SMS",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.NEW_EVENT,
        time: null,
        timeUnit: null,
        steps: [baseSmsStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    // NEW_EVENT is immediate, should NOT go through lazy SMS
    expect(mockScheduleLazySMSWorkflow).not.toHaveBeenCalled();
  });

  test("should skip empty workflows", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 6,
        name: "Empty Workflow",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).not.toHaveBeenCalled();
    expect(mockScheduleLazyEmailWorkflow).not.toHaveBeenCalled();
  });

  test("should pass seatReferenceId when provided for SMS lazy scheduling", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 7,
        name: "Seated Before Event SMS",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [baseSmsStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      seatReferenceUid: "seat-ref-xyz",
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        seatReferenceId: "seat-ref-xyz",
      })
    );
  });

  test("should not schedule anything in isDryRun mode", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 8,
        name: "Dry Run Workflow",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [baseSmsStep],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      isDryRun: true,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).not.toHaveBeenCalled();
  });

  test("should not schedule anything when workflows array is empty", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows: [],
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).not.toHaveBeenCalled();
  });

  test("should handle multiple workflows with different triggers", async () => {
    const { scheduleWorkflowReminders } = await import("./reminderScheduler");

    const workflows = [
      {
        id: 9,
        name: "Before Event SMS",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [baseSmsStep],
      },
      {
        id: 10,
        name: "After Event SMS",
        userId: 1,
        teamId: null,
        trigger: WorkflowTriggerEvents.AFTER_EVENT,
        time: 60,
        timeUnit: TimeUnit.MINUTE,
        steps: [{ ...baseSmsStep, id: 102 }],
      },
    ];

    const calendarEvent = createMockCalendarEvent();
    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: "+1234567890",
      calendarEvent: calendarEvent as any,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledTimes(2);
    // Verify first call is BEFORE_EVENT
    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ workflowTriggerEvent: "BEFORE_EVENT", workflowStepId: 100 })
    );
    // Verify second call is AFTER_EVENT
    expect(mockScheduleLazySMSWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ workflowTriggerEvent: "AFTER_EVENT", workflowStepId: 102 })
    );
  });
});
