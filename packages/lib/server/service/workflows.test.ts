import { describe, expect, vi, beforeEach } from "vitest";

import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { tasker } from "@calcom/features/tasker";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { WorkflowService } from "./workflows";

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler");
vi.mock("@calcom/features/tasker");

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);
const mockTasker = vi.mocked(tasker);

// Mock the getHideBranding function to return false
vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  getHideBranding: vi.fn().mockResolvedValue(false),
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

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      form: mockForm,
    });

    expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith({
      smsReminderNumber: "+1234567890",
      formData: {
        responses: mockResponses,
        user: { email: "formowner@example.com", timeFormat: 12, locale: "en" },
      },
      hideBranding: false,
      workflows: [workflows[0]],
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

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      responseId: 123,
      form: mockForm,
    });

    expect(mockTasker.create).toHaveBeenCalledWith(
      "triggerFormSubmittedNoEventWorkflow",
      {
        responseId: 123,
        responses: mockResponses,
        smsReminderNumber: "+1234567890",
        hideBranding: false,
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

    await WorkflowService.scheduleFormWorkflows({
      workflows,
      responses: mockResponses,
      form: formWithoutPhone,
    });

    expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith({
      smsReminderNumber: null,
      formData: {
        responses: mockResponses,
        user: { email: "formowner@example.com", timeFormat: 12, locale: "en" },
      },
      hideBranding: false,
      workflows: [workflows[0]],
    });
  });
});
