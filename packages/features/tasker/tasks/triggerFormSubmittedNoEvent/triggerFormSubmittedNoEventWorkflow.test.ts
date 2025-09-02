import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";
import type { z } from "zod";

import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { ZTriggerFormSubmittedNoEventWorkflowPayloadSchema } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWorkflow";
import { triggerFormSubmittedNoEventWorkflow } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWorkflow";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";

// Mock the scheduleWorkflowReminders function
vi.mock("@calcom/ee/workflows/lib/reminders/reminderScheduler", () => ({
  scheduleWorkflowReminders: vi.fn(() => Promise.resolve()),
}));

// Mock the logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);

type WorkflowPayload = z.infer<typeof ZTriggerFormSubmittedNoEventWorkflowPayloadSchema>;

function expectFormSubmittedNoEventWorkflowToBeCalled(payload: WorkflowPayload) {
  expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith({
    workflows: [payload.workflow],
    smsReminderNumber: null,
    calendarEvent: null,
    hideBranding: false,
  });
}

describe("Form submitted, no event booked workflow trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the form response queries to return empty arrays by default
    prismaMock.app_RoutingForms_FormResponse.findMany.mockResolvedValue([]);
  });

  it(`should trigger workflow when form was submitted but no booking was made`, async () => {
    const payload: WorkflowPayload = {
      responseId: 1,
      formId: "1234",
      responses: {
        "Test field 1": {
          value: "Test input 1",
          response: "Test input 1",
        },
      },
      workflow: {
        id: 1,
        name: "Test Workflow 1",
        teamId: null,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
        time: 15,
        timeUnit: TimeUnit.MINUTE,
        userId: 1,
        steps: [
          {
            id: 1,
            action: WorkflowActions.EMAIL_ATTENDEE,
            sendTo: null,
            template: WorkflowTemplates.CUSTOM,
            reminderBody: "Follow up on your form submission",
            emailSubject: "Follow Up",
            sender: null,
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            verifiedAt: null,
          },
        ],
      },
    };
    const payloadString = JSON.stringify(payload);

    // Mock that no booking exists
    prismaMock.booking.findFirst.mockResolvedValue(null);

    await triggerFormSubmittedNoEventWorkflow(payloadString);

    expectFormSubmittedNoEventWorkflowToBeCalled(payload);
  });

  it(`should not trigger workflow when form was submitted and also booking was made after`, async () => {
    const payload: WorkflowPayload = {
      responseId: 2,
      formId: "6789",
      responses: {
        "Test field 2": {
          value: "Test input 2",
          response: "Test input 2",
        },
      },
      workflow: {
        id: 2,
        name: "Test Workflow 2",
        teamId: null,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
        time: 30,
        timeUnit: TimeUnit.MINUTE,
        userId: 2,
        steps: [
          {
            id: 2,
            action: WorkflowActions.SMS_ATTENDEE,
            sendTo: null,
            template: WorkflowTemplates.CUSTOM,
            reminderBody: "SMS follow up",
            emailSubject: null,
            sender: null,
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            verifiedAt: null,
          },
        ],
      },
    };
    const payloadString = JSON.stringify(payload);

    // Mock that a booking exists
    prismaMock.booking.findFirst.mockResolvedValue({ id: 5 });

    await triggerFormSubmittedNoEventWorkflow(payloadString);

    // Should not call scheduleWorkflowReminders when booking exists
    expect(mockScheduleWorkflowReminders).not.toHaveBeenCalled();
  });

  it(`should handle workflow with multiple steps`, async () => {
    const payload: WorkflowPayload = {
      responseId: 3,
      formId: "9999",
      responses: {
        email: {
          value: "test@example.com",
          response: "test@example.com",
        },
        name: {
          value: "John Doe",
          response: "John Doe",
        },
      },
      workflow: {
        id: 3,
        name: "Multi-step Workflow",
        teamId: 1,
        trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
        time: 60,
        timeUnit: TimeUnit.MINUTE,
        userId: 3,
        steps: [
          {
            id: 3,
            action: WorkflowActions.EMAIL_ATTENDEE,
            sendTo: null,
            template: WorkflowTemplates.CUSTOM,
            reminderBody: "Thank you for your submission",
            emailSubject: "Form Received",
            sender: null,
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            verifiedAt: null,
          },
          {
            id: 4,
            action: WorkflowActions.EMAIL_ATTENDEE,
            sendTo: null,
            template: WorkflowTemplates.CUSTOM,
            reminderBody: "Follow up message",
            emailSubject: "Follow Up",
            sender: null,
            includeCalendarEvent: false,
            numberVerificationPending: false,
            numberRequired: false,
            verifiedAt: null,
          },
        ],
      },
    };
    const payloadString = JSON.stringify(payload);

    // Mock that no booking exists
    prismaMock.booking.findFirst.mockResolvedValue(null);

    await triggerFormSubmittedNoEventWorkflow(payloadString);

    expectFormSubmittedNoEventWorkflowToBeCalled(payload);
  });
});
