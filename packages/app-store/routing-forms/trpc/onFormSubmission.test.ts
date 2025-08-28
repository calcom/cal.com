import "@calcom/lib/__mocks__/logger";

import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { WebhookTriggerEvents } from "@calcom/prisma/client";

import { _onFormSubmission } from "./utils";

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
    user: { id: 1, email: "test@example.com" },
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

    it("should schedule FORM_SUBMITTED_NO_EVENT webhooks via tasker", async () => {
      const tasker = await (await import("@calcom/features/tasker")).default;
      const mockWebhook = { id: "wh-no-event-1", secret: "secret" };
      const chosenAction = { type: "customPageMessage" as const, value: "test" };

      vi.mocked(getWebhooks).mockImplementation(async (options) => {
        if (options.triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT) {
          return [mockWebhook as any];
        }
        return [];
      });

      await _onFormSubmission(mockForm as any, mockResponse, responseId, chosenAction);

      expect(getWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT,
        })
      );
      expect(tasker.create).toHaveBeenCalledWith(
        "triggerFormSubmittedNoEventWebhook",
        {
          responseId,
          form: {
            id: mockForm.id,
            name: mockForm.name,
            teamId: mockForm.teamId,
          },
          responses: {
            email: {
              value: "test@response.com",
              response: "test@response.com",
            },
            name: { value: "Test Name", response: "Test Name" },
          },
          redirect: chosenAction,
          webhook: mockWebhook,
        },
        { scheduledAt: expect.any(Date) }
      );
    });
  });

  describe("Response Email", () => {
    it("should send response email to team members for a team form", async () => {
      const teamForm = {
        ...mockForm,
        teamId: 1,
        userWithEmails: ["team-member1@example.com", "team-member2@example.com"],
        user: { id: 1, email: "test@example.com" },
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
