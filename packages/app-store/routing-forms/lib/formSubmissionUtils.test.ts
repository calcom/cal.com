/**
 * @vitest-environment node
 */
import "@calcom/lib/__mocks__/logger";
import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";

import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { WebhookSubscriber } from "@calcom/features/webhooks/lib/dto/types";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import {
  WebhookTriggerEvents,
  WorkflowTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
  TimeUnit,
} from "@calcom/prisma/enums";
import { WebhookVersion as WebhookVersionEnum } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

import type { FormResponse, Field } from "../types/types";
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
vi.mock("@calcom/features/ee/workflows/lib/service/WorkflowService", () => ({
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
    disabled: false,
    userId: 1,
    position: 0,
    description: null,
    updatedById: null,
    fields: [
      { id: "field-1", identifier: "email", label: "Email", type: "email", required: false },
      { id: "field-2", identifier: "name", label: "Name", type: "text", required: false },
    ] as Field[],
    user: { id: 1, email: "test@example.com", timeFormat: 12, locale: "en" },
    teamId: null,
    settings: { emailOwnerOnSubmission: true },
    routes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    connectedForms: [],
    routers: [],
    teamMembers: [],
  };

  const mockResponse: FormResponse = {
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
      const mockWebhook: WebhookSubscriber = {
        id: "wh-1",
        secret: "secret",
        subscriberUrl: "https://example.com/webhook",
        payloadTemplate: null,
        appId: null,
        eventTriggers: [WebhookTriggerEvents.FORM_SUBMITTED],
        time: null,
        timeUnit: null,
        version: WebhookVersionEnum.V_2021_10_20,
      };
      vi.mocked(getWebhooks).mockResolvedValueOnce([mockWebhook]);

      await _onFormSubmission(mockForm, mockResponse, responseId);

      expect(getWebhooks).toHaveBeenCalledWith({
        userId: 1,
        teamId: null,
        orgId: 1,
        triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      });
      expect(sendGenericWebhookPayload).toHaveBeenCalledTimes(1);
    });

    it("should normalize identifiers with spaces to hyphens in rootData for webhook templates", async () => {
      const formWithSpaces = {
        ...mockForm,
        fields: [
          {
            id: "field-1",
            identifier: "attendee name",
            label: "Attendee Name",
            type: "text",
            required: false,
          },
        ] as Field[],
      };

      const responseWithSpaces: FormResponse = {
        "field-1": { label: "Attendee Name", value: "John Doe" },
      };

      const mockWebhook: WebhookSubscriber = {
        id: "wh-1",
        secret: "secret",
        subscriberUrl: "https://example.com/webhook",
        payloadTemplate: null,
        appId: null,
        eventTriggers: [WebhookTriggerEvents.FORM_SUBMITTED],
        time: null,
        timeUnit: null,
        version: WebhookVersionEnum.V_2021_10_20,
      };
      vi.mocked(getWebhooks).mockResolvedValueOnce([mockWebhook]);

      await _onFormSubmission(formWithSpaces, responseWithSpaces, responseId);

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          rootData: expect.objectContaining({
            "attendee-name": "John Doe", // Spaces replaced with hyphens for template access
          }),
        })
      );
    });
  });

  describe("Workflows", () => {
    it("should call WorkflowService.scheduleFormWorkflows for FORM_SUBMITTED workflows", async () => {
      const mockWorkflows: Workflow[] = [
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
              sender: null,
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

      vi.mocked(WorkflowService.getAllWorkflowsFromRoutingForm).mockResolvedValueOnce(mockWorkflows);

      await _onFormSubmission(mockForm, mockResponse, responseId);

      expect(WorkflowService.getAllWorkflowsFromRoutingForm).toHaveBeenCalledWith(mockForm);
      expect(WorkflowService.scheduleFormWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          workflows: mockWorkflows,
          responses: {
            email: {
              value: "test@response.com",
              response: "test@response.com",
            },
            name: { value: "Test Name", response: "Test Name" },
          },
          responseId,
          routedEventTypeId: null,
          form: {
            ...mockForm,
            fields: mockForm.fields.map((field) => ({
              type: field.type,
              identifier: field.identifier,
            })),
          },
          creditCheckFn: expect.any(Function),
        })
      );
    });

    it("should call WorkflowService.scheduleFormWorkflows for FORM_SUBMITTED_NO_EVENT workflows", async () => {
      const mockWorkflows: Workflow[] = [
        {
          id: 2,
          name: "Form Follow-up Workflow",
          userId: 1,
          teamId: null,
          trigger: WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
          time: 30,
          timeUnit: TimeUnit.MINUTE,
          steps: [
            {
              id: 2,
              action: WorkflowActions.EMAIL_ATTENDEE,
              sendTo: null,
              sender: null,
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

      vi.mocked(WorkflowService.getAllWorkflowsFromRoutingForm).mockResolvedValueOnce(mockWorkflows);

      await _onFormSubmission(mockForm, mockResponse, responseId);

      expect(WorkflowService.getAllWorkflowsFromRoutingForm).toHaveBeenCalledWith(mockForm);
      expect(WorkflowService.scheduleFormWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          workflows: mockWorkflows,
          responses: {
            email: {
              value: "test@response.com",
              response: "test@response.com",
            },
            name: { value: "Test Name", response: "Test Name" },
          },
          routedEventTypeId: null,
          responseId,
          form: {
            ...mockForm,
            fields: mockForm.fields.map((field) => ({
              type: field.type,
              identifier: field.identifier,
            })),
          },
          creditCheckFn: expect.any(Function),
        })
      );
    });

    it("should pass routedEventTypeId when chosenAction is eventTypeRedirectUrl", async () => {
      const mockWorkflows: Workflow[] = [
        {
          id: 3,
          name: "Event Type Workflow",
          userId: 1,
          teamId: null,
          trigger: WorkflowTriggerEvents.FORM_SUBMITTED,
          time: null,
          timeUnit: null,
          steps: [
            {
              id: 3,
              action: WorkflowActions.CAL_AI_PHONE_CALL,
              sendTo: null,
              sender: null,
              reminderBody: null,
              emailSubject: null,
              template: WorkflowTemplates.CUSTOM,
              verifiedAt: new Date(),
              includeCalendarEvent: false,
              numberVerificationPending: false,
              numberRequired: false,
            },
          ],
        },
      ];

      const chosenAction = {
        type: "eventTypeRedirectUrl" as const,
        value: "/team/test-team/test-event",
        eventTypeId: 42,
      };

      vi.mocked(WorkflowService.getAllWorkflowsFromRoutingForm).mockResolvedValueOnce(mockWorkflows);

      await _onFormSubmission(mockForm, mockResponse, responseId, chosenAction);

      expect(WorkflowService.scheduleFormWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          workflows: mockWorkflows,
          responses: {
            email: {
              value: "test@response.com",
              response: "test@response.com",
            },
            name: { value: "Test Name", response: "Test Name" },
          },
          routedEventTypeId: 42,
          responseId,
          form: {
            ...mockForm,
            fields: mockForm.fields.map((field) => ({
              type: field.type,
              identifier: field.identifier,
            })),
          },
          creditCheckFn: expect.any(Function),
        })
      );
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

      await _onFormSubmission(teamForm, mockResponse, responseId);

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

      await _onFormSubmission(ownerForm, mockResponse, responseId);

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

      await _onFormSubmission(ownerForm, mockResponse, responseId);

      expect(mockResponseEmailConstructor).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
