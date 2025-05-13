import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

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

describe("reminderScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cancelScheduledMessagesAndScheduleEmails", () => {
    it("should cancel SMS messages and schedule emails for team", async () => {
      prismaMock.membership.findMany.mockResolvedValue([]);

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

      await cancelScheduledMessagesAndScheduleEmails(1);

      expect(twilioProvider.cancelSMS).toHaveBeenCalledWith("sms-123");

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["attendee@example.com"],
          replyTo: "organizer@example.com",
          referenceUid: "uuid-123",
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
