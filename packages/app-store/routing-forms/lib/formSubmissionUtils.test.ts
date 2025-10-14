import "@calcom/lib/__mocks__/logger";
import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import {
  WebhookTriggerEvents,
  WorkflowTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
} from "@calcom/prisma/enums";

import { _onFormSubmission } from "./formSubmissionUtils";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

// Mock dependencies
vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn(() => Promise.resolve(1)),
}));
vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({
  default: vi.fn(() => Promise.resolve([])),
}));
vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  sendGenericWebhookPayload: vi.fn(() => Promise.resolve()),
}));
vi.mock("@calcom/features/tasker", () => {
  const tasker = {
    create: vi.fn(() => Promise.resolve()),
  };
  return { default: Promise.resolve(tasker) };
});

// Mock workflow dependencies
vi.mock("@calcom/lib/server/service/workflows", () => ({
  WorkflowService: {
    getAllWorkflowsFromRoutingForm: vi.fn(() => Promise.resolve([])),
    scheduleFormWorkflows: vi.fn(() => Promise.resolve()),
  },
}));

const mockSendEmail = vi.fn(() => Promise.resolve());
const mockResponseEmailConstructor = vi.fn();
vi.mock("../emails/templates/response-email", () => ({
  default: class MockResponseEmail {
    sendEmail = mockSendEmail;
    constructor(...args: unknown[]) {
      mockResponseEmailConstructor(...args);
    }
  },
}));

describe("_onFormSubmission", () => {
  const mockForm = {
    id: "form-1",
    name: "Test Form",
    fields: [
      { id: "field-1", identifier: "email", label: "Email", type: "email" },
      { id: "field-2", identifier: "name", label: "Name", type: "text" },
    ],
    user: { id: 1, email: "test@example.com", timeFormat: 12, locale: "en" },
    teamId: null,
    settings: { emailOwnerOnSubmission: true },
  };

  const mockResponse = {
    "field-1": { label: "Email", value: "test@response.com" },
    "field-2": { label: "Name", value: "Test Name" },
  };

  const responseId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Webhooks", () => {
    it("should call FORM_SUBMITTED webhooks", async () => {
      vi.mocked(getWebhooks).mockResolvedValueOnce([{ id: "wh-1", secret: "secret" } as any]);

      await _onFormSubmission(mockForm as any, mockResponse, responseId);

      expect(getWebhooks).toHaveBeenCalledWith({
        userId: 1,
        teamId: null,
        orgId: 1,
        triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      });
      expect(sendGenericWebhookPayload).toHaveBeenCalledTimes(1);
    });
  });

  describe("Workflows", () => {
    it("should call WorkflowService.scheduleFormWorkflows for FORM_SUBMITTED workflows", async () => {
      const mockWorkflows = [
        {
          id: 1,
          name: "Form Submitted Workflow",
          userId: 1,
          teamId: null,
          trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
          time: null,
          timeUnit: null,
          steps: [
            {
              id: 1,
              action: WorkflowActions.EMAIL_ATTENDEE,
              sendTo: null,
              reminderBody: "Thank you for your submission!",
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

      vi.mocked(WorkflowService.getAllWorkflowsFromRoutingForm).mockResolvedValueOnce(mockWorkflows as any);

      await _onFormSubmission(mockForm as any, mockResponse, responseId);

      expect(WorkflowService.getAllWorkflowsFromRoutingForm).toHaveBeenCalledWith(mockForm);
      expect(WorkflowService.scheduleFormWorkflows).toHaveBeenCalledWith({
        workflows: mockWorkflows,
        responses: {
          email: {
            value: "test@response.com",
            response: "test@response.com",
          },
          name: { value: "Test Name", response: "Test Name" },
        },
        responseId,
        form: {
          ...mockForm,
          fields: mockForm.fields.map((field) => ({
            type: field.type,
            identifier: field.identifier,
          })),
        },
      });
    });

    it("should call WorkflowService.scheduleFormWorkflows for FORM_SUBMITTED_NO_EVENT workflows", async () => {
      const mockWorkflows = [
        {
          id: 2,
          name: "Form Follow-up Workflow",
          userId: 1,
          teamId: null,
          trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
          time: 30,
          timeUnit: "MINUTE",
          steps: [
            {
              id: 2,
              action: WorkflowActions.EMAIL_ATTENDEE,
              sendTo: null,
              reminderBody: "Follow up on your form submission",
              emailSubject: "Follow Up",
              template: WorkflowTemplates.CUSTOM,
              verifiedAt: new Date(),
              includeCalendarEvent: false,
              numberVerificationPending: false,
              numberRequired: false,
            },
          ],
        },
      ];

      vi.mocked(WorkflowService.getAllWorkflowsFromRoutingForm).mockResolvedValueOnce(mockWorkflows as any);

      await _onFormSubmission(mockForm as any, mockResponse, responseId);

      expect(WorkflowService.getAllWorkflowsFromRoutingForm).toHaveBeenCalledWith(mockForm);
      expect(WorkflowService.scheduleFormWorkflows).toHaveBeenCalledWith({
        workflows: mockWorkflows,
        responses: {
          email: {
            value: "test@response.com",
            response: "test@response.com",
          },
          name: { value: "Test Name", response: "Test Name" },
        },
        responseId,
        form: {
          ...mockForm,
          fields: mockForm.fields.map((field) => ({
            type: field.type,
            identifier: field.identifier,
          })),
        },
      });
    });
  });

  describe("Response Email", () => {
    it("should send response email to team members for a team form", async () => {
      const teamForm = {
        ...mockForm,
        teamId: 1,
        userWithEmails: ["team-member1@example.com", "team-member2@example.com"],
        user: { id: 1, email: "test@example.com", timeFormat: 12, locale: "en" },
      };

      await _onFormSubmission(teamForm as any, mockResponse, responseId);

      expect(mockResponseEmailConstructor).toHaveBeenCalledWith({
        form: teamForm,
        toAddresses: ["team-member1@example.com", "team-member2@example.com"],
        orderedResponses: [mockResponse["field-1"], mockResponse["field-2"]],
      });
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("should send response email to owner when enabled", async () => {
      const ownerForm = {
        ...mockForm,
        settings: { emailOwnerOnSubmission: true },
      };

      await _onFormSubmission(ownerForm as any, mockResponse, responseId);

      expect(mockResponseEmailConstructor).toHaveBeenCalledWith({
        form: ownerForm,
        toAddresses: [ownerForm.user.email],
        orderedResponses: [mockResponse["field-1"], mockResponse["field-2"]],
      });
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it("should not send response email to owner when disabled", async () => {
      const ownerForm = {
        ...mockForm,
        settings: { emailOwnerOnSubmission: false },
      };

      await _onFormSubmission(ownerForm as any, mockResponse, responseId);

      expect(mockResponseEmailConstructor).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
