import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { WorkflowMethods } from "@calcom/prisma/enums";

import { sendOrScheduleWorkflowEmails } from "./providers/emailProvider";
import * as twilioProvider from "./providers/twilioProvider";
import { cancelScheduledMessagesAndScheduleEmails } from "./reminderScheduler";

vi.mock("@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider", () => ({
  cancelSMS: vi.fn(),
  getMessageBody: vi.fn().mockResolvedValue("Test message body"),
}));

vi.mock("@calcom/features/ee/workflows/lib/reminders/providers/emailProvider", () => ({
  sendOrScheduleWorkflowEmails: vi.fn(),
}));

vi.mock("@calcom/lib/server/i18n", () => {
  return {
    getTranslation: async (locale: string, namespace: string) => {
      const t = (key: string) => key;
      t.locale = locale;
      t.namespace = namespace;
      return t;
    },
  };
});
describe("reminderScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cancelScheduledMessagesAndScheduleEmails", () => {
    it("should cancel SMS messages and schedule emails for team", async () => {
      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-123",
          workflowStep: {
            action: "SMS_ATTENDEE",
          },
          scheduledDate: new Date(),
          uuid: "uuid-123",
          booking: {
            attendees: [
              {
                email: "attendee@example.com",
                locale: "en",
              },
            ],
            user: {
              email: "organizer@example.com",
            },
          },
        },
      ];

      prismaMock.workflowReminder.findMany.mockResolvedValue(mockScheduledMessages);

      prismaMock.workflowReminder.updateMany.mockResolvedValue({ count: 1 });

      await cancelScheduledMessagesAndScheduleEmails({ teamId: 10, userIdsWithNoCredits: [1, 2, 3] });

      expect(twilioProvider.cancelSMS).toHaveBeenCalledWith("sms-123");

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["attendee@example.com"],
          replyTo: "organizer@example.com",
          referenceUid: "uuid-123",
        })
      );

      const callArgs = prismaMock.workflowReminder.findMany.mock.calls[0][0];
      expect(callArgs.where.workflowStep.workflow.OR).toEqual([
        { userId: { in: [1, 2, 3] } },
        { teamId: 10 },
      ]);
    });

    it("should cancel SMS messages and schedule emails for user", async () => {
      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-456",
          workflowStep: {
            action: "SMS_ATTENDEE",
          },
          scheduledDate: new Date(),
          uuid: "uuid-456",
          booking: {
            attendees: [
              {
                email: "user-attendee@example.com",
                locale: "en",
              },
            ],
            user: {
              email: "user-organizer@example.com",
            },
          },
        },
      ];

      prismaMock.workflowReminder.findMany.mockResolvedValue(mockScheduledMessages);

      prismaMock.workflowReminder.updateMany.mockResolvedValue({ count: 1 });

      await cancelScheduledMessagesAndScheduleEmails({ userIdsWithNoCredits: [11] });

      const callArgs = prismaMock.workflowReminder.findMany.mock.calls[0][0];
      expect(callArgs.where.workflowStep.workflow.OR).toEqual([{ userId: { in: [11] } }]);

      expect(twilioProvider.cancelSMS).toHaveBeenCalledWith("sms-456");

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user-attendee@example.com"],
          replyTo: "user-organizer@example.com",
          referenceUid: "uuid-456",
        })
      );

      expect(prismaMock.workflowReminder.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
        data: {
          method: WorkflowMethods.EMAIL,
          referenceId: null,
        },
      });
    });
  });
});
