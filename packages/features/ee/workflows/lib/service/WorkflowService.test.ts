import dayjs from "@calcom/dayjs";
import { describe, expect, vi, beforeEach } from "vitest";

import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { tasker } from "@calcom/features/tasker";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { WorkflowService } from "./WorkflowService";

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler");
vi.mock("@calcom/features/tasker");

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);
const mockTasker = vi.mocked(tasker);

vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  getHideBranding: vi.fn().mockResolvedValue(false),
}));

const mockWorkflowReminderCreate = vi.fn();
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository", () => ({
  WorkflowReminderRepository: vi.fn().mockImplementation(function () {
    return {
      create: mockWorkflowReminderCreate,
    };
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
  default: {},
}));

describe("WorkflowService.scheduleFormWorkflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockForm = {
    id: "form-123",
    userId: 101,
    teamId: null,
    fields: [
      { type: "email", identifier: "email" },
      { type: "phone", identifier: "phone" },
    ],
    user: {
      email: "formowner@example.com",
      timeFormat: 12,
      locale: "en",
    },
  };

  const mockResponses = {
    email: {
      value: "submitter@example.com",
      response: "submitter@example.com",
    },
    phone: {
      value: "+1234567890",
      response: "+1234567890",
    },
  };

  test("should call scheduleWorkflowReminders for FORM_SUBMITTED triggers with correct phone number", async () => {
    const workflows = [
      {
        id: 1,
        name: "Form Submitted",
        userId: 101,
        teamId: null,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
        time: null,
        timeUnit: null,
        steps: [
          {
            id: 1,
            action: WorkflowActions.SMS_ATTENDEE,
            sendTo: null,
            reminderBody: "Thank you!",
            emailSubject: "Form Received",
            template: WorkflowTemplates.CUSTOM,
            verifiedAt: new Date(),
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
          },
        ],
      },
    ];

    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      form: mockForm,
      responseId: 123,
      routedEventTypeId: null,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith({
      smsReminderNumber: "+1234567890",
      formData: {
        responses: mockResponses,
        user: { email: "formowner@example.com", timeFormat: 12, locale: "en" },
        routedEventTypeId: null,
      },
      hideBranding: false,
      workflows: [workflows[0]],
      creditCheckFn: mockCreditCheckFn,
    });
  });

  test("should create task for FORM_SUBMITTED_NO_EVENT triggers", async () => {
    const workflows = [
      {
        id: 2,
        name: "Form Follow-up",
        userId: 101,
        teamId: null,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        steps: [
          {
            id: 2,
            action: WorkflowActions.EMAIL_ATTENDEE,
            sendTo: null,
            reminderBody: "Follow up message",
            emailSubject: "Follow Up",
            template: WorkflowTemplates.CUSTOM,
            verifiedAt: new Date(),
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            sender: null,
          },
        ],
      },
    ];

    mockTasker.create.mockResolvedValue({ id: "task-123" });

    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      responseId: 123,
      form: mockForm,
      routedEventTypeId: null,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "triggerFormSubmittedNoEventWorkflow",
      {
        responseId: 123,
        responses: mockResponses,
        smsReminderNumber: "+1234567890",
        hideBranding: false,
        routedEventTypeId: null,
        submittedAt: expect.any(Date),
        form: {
          id: "form-123",
          userId: 101,
          teamId: undefined,
          user: {
            email: "formowner@example.com",
            timeFormat: 12,
            locale: "en",
          },
        },
        workflow: workflows[0],
      },
      { scheduledAt: expect.any(Date) }
    );
  });

  test("should handle forms without phone fields by passing null smsReminderNumber", async () => {
    const formWithoutPhone = {
      ...mockForm,
      fields: [
        { type: "email", identifier: "email" },
        { type: "text", identifier: "name" },
      ],
    };

    const workflows = [
      {
        id: 1,
        name: "Form Submitted",
        userId: 101,
        teamId: null,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
        time: null,
        timeUnit: null,
        steps: [
          {
            id: 1,
            action: WorkflowActions.EMAIL_ATTENDEE,
            sendTo: null,
            reminderBody: "Thank you!",
            emailSubject: "Form Received",
            template: WorkflowTemplates.CUSTOM,
            verifiedAt: new Date(),
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            sender: null,
          },
        ],
      },
    ];

    const mockCreditCheckFn = vi.fn().mockResolvedValue(true);

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      form: formWithoutPhone,
      responseId: 123,
      routedEventTypeId: null,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith({
      smsReminderNumber: null,
      formData: {
        responses: mockResponses,
        user: { email: "formowner@example.com", timeFormat: 12, locale: "en" },
        routedEventTypeId: null,
      },
      hideBranding: false,
      workflows: [workflows[0]],
      creditCheckFn: mockCreditCheckFn,
    });
  });
});

describe("WorkflowService.scheduleLazyEmailWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should schedule lazy email workflow for BEFORE_EVENT trigger", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    // Use future dates to ensure scheduled date is not in the past
    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-123",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 1,
      uuid: "reminder-uuid-123",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue({ id: "task-123" });

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 1,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).toHaveBeenCalledWith({
      bookingUid: "booking-123",
      workflowStepId: 1,
      method: "EMAIL",
      scheduledDate: expect.any(Date),
      scheduled: true,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "sendWorkflowEmails",
      {
        bookingUid: "booking-123",
        workflowReminderId: 1,
      },
      {
        scheduledAt: expect.any(Date),
        referenceUid: "reminder-uuid-123",
      }
    );
  });

  test("should schedule lazy email workflow for AFTER_EVENT trigger", async () => {
    const mockWorkflow = {
      time: 1,
      timeUnit: TimeUnit.HOUR,
    };

    // Use future dates to ensure scheduled date is not in the past
    const futureStartTime = dayjs().add(1, "day").toISOString();
    const futureEndTime = dayjs().add(1, "day").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-456",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 2,
      uuid: "reminder-uuid-456",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue({ id: "task-456" });

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "AFTER_EVENT",
      workflowStepId: 2,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "sendWorkflowEmails",
      {
        bookingUid: "booking-456",
        workflowReminderId: 2,
      },
      {
        scheduledAt: expect.any(Date),
        referenceUid: "reminder-uuid-456",
      }
    );
  });

  test("should handle seated events with seatReferenceId", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    // Use future dates to ensure scheduled date is not in the past
    const futureStartTime = dayjs().add(3, "days").toISOString();
    const futureEndTime = dayjs().add(3, "days").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-789",
      startTime: futureStartTime,
      endTime: futureEndTime,
    };

    const mockWorkflowReminder = {
      id: 3,
      uuid: "reminder-uuid-789",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue({ id: "task-789" });

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 3,
      workflow: mockWorkflow,
      evt: mockEvt,
      seatReferenceId: "seat-123",
    });

    expect(mockTasker.create).toHaveBeenCalled();
  });

  test("should not schedule if bookingUid is missing", async () => {
    const mockWorkflow = {
      time: 24,
      timeUnit: TimeUnit.HOUR,
    };

    const mockEvt = {
      uid: "",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 1,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should not schedule if time is null", async () => {
    const mockWorkflow = {
      time: null,
      timeUnit: TimeUnit.HOUR,
    };

    const mockEvt = {
      uid: "booking-123",
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 1,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should skip reminder if scheduled date is in the past for BEFORE_EVENT", async () => {
    const mockWorkflow = {
      time: 48,
      timeUnit: TimeUnit.HOUR,
    };

    // Event is only 24 hours away, but reminder is set for 48 hours before
    // This means the scheduled date would be in the past
    const tomorrowStartTime = dayjs().add(1, "day").toISOString();
    const tomorrowEndTime = dayjs().add(1, "day").add(1, "hour").toISOString();

    const mockEvt = {
      uid: "booking-past-reminder",
      startTime: tomorrowStartTime,
      endTime: tomorrowEndTime,
    };

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "BEFORE_EVENT",
      workflowStepId: 1,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    // Should not create reminder or schedule task when scheduled date is in the past
    expect(mockWorkflowReminderCreate).not.toHaveBeenCalled();
    expect(mockTasker.create).not.toHaveBeenCalled();
  });

  test("should not skip reminder for AFTER_EVENT even if calculated date seems past", async () => {
    const mockWorkflow = {
      time: 1,
      timeUnit: TimeUnit.HOUR,
    };

    // For AFTER_EVENT, we add time to endTime, so it should always be in the future
    const pastStartTime = dayjs().subtract(1, "hour").toISOString();
    const pastEndTime = dayjs().subtract(30, "minutes").toISOString();

    const mockEvt = {
      uid: "booking-after-event",
      startTime: pastStartTime,
      endTime: pastEndTime,
    };

    const mockWorkflowReminder = {
      id: 4,
      uuid: "reminder-uuid-after",
    };

    mockWorkflowReminderCreate.mockResolvedValue(mockWorkflowReminder);
    mockTasker.create.mockResolvedValue({ id: "task-after" });

    await WorkflowService.scheduleLazyEmailWorkflow({
      workflowTriggerEvent: "AFTER_EVENT",
      workflowStepId: 4,
      workflow: mockWorkflow,
      evt: mockEvt,
    });

    // AFTER_EVENT reminders should still be scheduled (they're relative to endTime + time)
    expect(mockWorkflowReminderCreate).toHaveBeenCalled();
    expect(mockTasker.create).toHaveBeenCalled();
  });
});

describe("WorkflowService.processWorkflowScheduledDate", () => {
  test("should calculate scheduled date for BEFORE_EVENT trigger", () => {
    const evt = {
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    const result = WorkflowService.processWorkflowScheduledDate({
      workflowTriggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 24,
      timeUnit: TimeUnit.HOUR,
      evt,
    });

    expect(result).toBeDefined();
    expect(result?.toISOString()).toBe("2024-11-30T10:00:00.000Z");
  });

  test("should calculate scheduled date for AFTER_EVENT trigger", () => {
    const evt = {
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    const result = WorkflowService.processWorkflowScheduledDate({
      workflowTriggerEvent: WorkflowTriggerEvents.AFTER_EVENT,
      time: 1,
      timeUnit: TimeUnit.HOUR,
      evt,
    });

    expect(result).toBeDefined();
    expect(result?.toISOString()).toBe("2024-12-01T12:00:00.000Z");
  });

  test("should return null if time is null", () => {
    const evt = {
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    const result = WorkflowService.processWorkflowScheduledDate({
      workflowTriggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      time: null,
      timeUnit: TimeUnit.HOUR,
      evt,
    });

    expect(result).toBeNull();
  });

  test("should return null if timeUnit is null", () => {
    const evt = {
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    const result = WorkflowService.processWorkflowScheduledDate({
      workflowTriggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 24,
      timeUnit: null,
      evt,
    });

    expect(result).toBeNull();
  });

  test("should calculate scheduled date with MINUTE time unit", () => {
    const evt = {
      startTime: "2024-12-01T10:00:00Z",
      endTime: "2024-12-01T11:00:00Z",
    };

    const result = WorkflowService.processWorkflowScheduledDate({
      workflowTriggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 30,
      timeUnit: TimeUnit.MINUTE,
      evt,
    });

    expect(result).toBeDefined();
    expect(result?.toISOString()).toBe("2024-12-01T09:30:00.000Z");
  });
});

describe("WorkflowService.generateCommonScheduleFunctionParams", () => {
  test("should generate common parameters correctly", () => {
    const verifiedAt = new Date("2024-01-01T00:00:00Z");
    const mockWorkflow = {
      id: 1,
      name: "Test Workflow",
      trigger: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 24,
      timeUnit: TimeUnit.HOUR,
      userId: 1,
      teamId: null,
    };

    const mockWorkflowStep = {
      id: 1,
      action: WorkflowActions.EMAIL_ATTENDEE,
      sendTo: null,
      template: WorkflowTemplates.REMINDER,
      reminderBody: null,
      emailSubject: null,
      sender: null,
      includeCalendarEvent: false,
      verifiedAt,
      numberVerificationPending: false,
      numberRequired: false,
    };

    const mockCreditCheckFn = vi.fn();

    const result = WorkflowService.generateCommonScheduleFunctionParams({
      workflow: mockWorkflow,
      workflowStep: mockWorkflowStep,
      seatReferenceUid: undefined,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(result).toEqual({
      triggerEvent: WorkflowTriggerEvents.BEFORE_EVENT,
      timeSpan: {
        time: 24,
        timeUnit: TimeUnit.HOUR,
      },
      workflowStepId: 1,
      template: WorkflowTemplates.REMINDER,
      userId: 1,
      teamId: null,
      seatReferenceUid: undefined,
      verifiedAt,
      creditCheckFn: mockCreditCheckFn,
    });
  });

  test("should handle seated events with seatReferenceUid", () => {
    const verifiedAt = new Date("2024-01-01T00:00:00Z");
    const mockWorkflow = {
      id: 1,
      name: "Test Workflow",
      trigger: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 24,
      timeUnit: TimeUnit.HOUR,
      userId: 1,
      teamId: null,
    };

    const mockWorkflowStep = {
      id: 1,
      action: WorkflowActions.EMAIL_ATTENDEE,
      sendTo: null,
      template: WorkflowTemplates.REMINDER,
      reminderBody: null,
      emailSubject: null,
      sender: null,
      includeCalendarEvent: false,
      verifiedAt,
      numberVerificationPending: false,
      numberRequired: false,
    };

    const mockCreditCheckFn = vi.fn();

    const result = WorkflowService.generateCommonScheduleFunctionParams({
      workflow: mockWorkflow,
      workflowStep: mockWorkflowStep,
      seatReferenceUid: "seat-123",
      creditCheckFn: mockCreditCheckFn,
    });

    expect(result.seatReferenceUid).toBe("seat-123");
  });

  test("should handle null verifiedAt", () => {
    const mockWorkflow = {
      id: 1,
      name: "Test Workflow",
      trigger: WorkflowTriggerEvents.BEFORE_EVENT,
      time: 24,
      timeUnit: TimeUnit.HOUR,
      userId: 1,
      teamId: null,
    };

    const mockWorkflowStep = {
      id: 1,
      action: WorkflowActions.EMAIL_ATTENDEE,
      sendTo: null,
      template: WorkflowTemplates.REMINDER,
      reminderBody: null,
      emailSubject: null,
      sender: null,
      includeCalendarEvent: false,
      verifiedAt: null,
      numberVerificationPending: false,
      numberRequired: false,
    };

    const mockCreditCheckFn = vi.fn();

    const result = WorkflowService.generateCommonScheduleFunctionParams({
      workflow: mockWorkflow,
      workflowStep: mockWorkflowStep,
      seatReferenceUid: undefined,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(result.verifiedAt).toBeNull();
  });

  test("should handle team workflows", () => {
    const verifiedAt = new Date("2024-01-01T00:00:00Z");
    const mockWorkflow = {
      id: 1,
      name: "Team Workflow",
      trigger: WorkflowTriggerEvents.AFTER_EVENT,
      time: 1,
      timeUnit: TimeUnit.HOUR,
      userId: null,
      teamId: 123,
    };

    const mockWorkflowStep = {
      id: 2,
      action: WorkflowActions.EMAIL_HOST,
      sendTo: null,
      template: WorkflowTemplates.CUSTOM,
      reminderBody: "Custom body",
      emailSubject: "Custom subject",
      sender: "Team",
      includeCalendarEvent: true,
      verifiedAt,
      numberVerificationPending: false,
      numberRequired: false,
    };

    const mockCreditCheckFn = vi.fn();

    const result = WorkflowService.generateCommonScheduleFunctionParams({
      workflow: mockWorkflow,
      workflowStep: mockWorkflowStep,
      seatReferenceUid: undefined,
      creditCheckFn: mockCreditCheckFn,
    });

    expect(result).toEqual({
      triggerEvent: WorkflowTriggerEvents.AFTER_EVENT,
      timeSpan: {
        time: 1,
        timeUnit: TimeUnit.HOUR,
      },
      workflowStepId: 2,
      template: WorkflowTemplates.CUSTOM,
      userId: null,
      teamId: 123,
      seatReferenceUid: undefined,
      verifiedAt,
      creditCheckFn: mockCreditCheckFn,
    });
  });
});
