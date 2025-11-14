import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";
import type { z } from "zod";

import { scheduleWorkflowReminders } from "@calcom/ee/workflows/lib/reminders/reminderScheduler";
import type { ZTriggerFormSubmittedNoEventWorkflowPayloadSchema } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWorkflow";
import { triggerFormSubmittedNoEventWorkflow } from "@calcom/features/tasker/tasks/triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWorkflow";
import { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, TimeUnit } from "@calcom/prisma/enums";

import { shouldTriggerFormSubmittedNoEvent } from "./formSubmissionValidation";

// Mock the scheduleWorkflowReminders function
vi.mock("@calcom/ee/workflows/lib/reminders/reminderScheduler", () => ({
  scheduleWorkflowReminders: vi.fn(() => Promise.resolve()),
}));

// Mock the form submission validation
vi.mock("./formSubmissionValidation", () => ({
  shouldTriggerFormSubmittedNoEvent: vi.fn(() => Promise.resolve(true)),
}));

// Mock the logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({ error: vi.fn() })),
    error: vi.fn(),
  },
}));

const mockScheduleWorkflowReminders = vi.mocked(scheduleWorkflowReminders);
const mockShouldTriggerFormSubmittedNoEvent = vi.mocked(shouldTriggerFormSubmittedNoEvent);

type WorkflowPayload = z.infer<typeof ZTriggerFormSubmittedNoEventWorkflowPayloadSchema>;

function expectFormSubmittedNoEventWorkflowToBeCalled(payload: WorkflowPayload) {
  expect(mockScheduleWorkflowReminders).toHaveBeenCalledWith(
    expect.objectContaining({
      workflows: [payload.workflow],
      formData: {
        responses: payload.responses,
        user: {
          email: payload.form.user.email,
          timeFormat: payload.form.user.timeFormat,
          locale: payload.form.user.locale ?? "en",
        },
        routedEventTypeId: payload.routedEventTypeId ?? null,
      },
      hideBranding: payload.hideBranding,
      smsReminderNumber: payload.smsReminderNumber,
    })
  );
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
      form: {
        id: "1234",
        userId: 1,
        teamId: null,
        fields: [{ type: "text", identifier: "Test field 1" }],
        user: {
          email: "test@example.com",
          timeFormat: 12,
          locale: "en",
        },
      },
      responses: {
        "Test field 1": {
          value: "Test input 1",
          response: "Test input 1",
        },
      },
      routedEventTypeId: null,
      hideBranding: false,
      smsReminderNumber: null,
      submittedAt: new Date("2024-01-01T10:00:00Z"),
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
      form: {
        id: "6789",
        userId: 2,
        teamId: null,
        fields: [{ type: "text", identifier: "Test field 2" }],
        user: {
          email: "test2@example.com",
          timeFormat: 24,
          locale: "en",
        },
      },
      responses: {
        "Test field 2": {
          value: "Test input 2",
          response: "Test input 2",
        },
      },
      routedEventTypeId: null,
      hideBranding: false,
      smsReminderNumber: null,
      submittedAt: new Date("2024-01-01T11:00:00Z"),
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

    // Mock that validation should not trigger (booking exists)
    mockShouldTriggerFormSubmittedNoEvent.mockResolvedValue(false);

    await triggerFormSubmittedNoEventWorkflow(payloadString);

    // Should not call scheduleWorkflowReminders when validation fails
    expect(mockScheduleWorkflowReminders).not.toHaveBeenCalled();
  });
});
