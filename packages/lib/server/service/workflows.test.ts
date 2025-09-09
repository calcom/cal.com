import { describe, expect, vi, beforeEach } from "vitest";

import { tasker } from "@calcom/features/tasker";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { scheduleWorkflowReminders } from "../../../features/ee/workflows/lib/reminders/reminderScheduler";
import { WorkflowService } from "./workflows";

vi.mock("../../../features/ee/workflows/lib/reminders/reminderScheduler");
vi.mock("@calcom/features/tasker");
vi.mock("../../hideBranding");

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);
const mockTasker = vi.mocked(tasker);

// Mock the getHideBranding function to return false
vi.mock("../../hideBranding", () => ({
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
      responseId: 123,
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
      responseId: 123,
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
