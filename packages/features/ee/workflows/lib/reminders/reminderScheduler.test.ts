import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { WorkflowMethods } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findFirstOrganizationIdForUser: vi.fn().mockResolvedValue(null),
  },
}));

import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { sendOrScheduleWorkflowEmails } from "./providers/emailProvider";
import * as twilioProvider from "./providers/twilioProvider";
import { cancelScheduledMessagesAndScheduleEmails } from "./reminderScheduler";

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

    it("should pass organizationId when workflow belongs to an organization team", async () => {
      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-org-123",
          workflowStep: {
            action: "SMS_ATTENDEE",
            workflow: {
              teamId: 100,
              userId: null,
              team: {
                isOrganization: true,
                parentId: null,
              },
            },
          },
          scheduledDate: new Date(),
          uuid: "uuid-org-123",
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

      await cancelScheduledMessagesAndScheduleEmails({ teamId: 100, userIdsWithNoCredits: [] });

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 100,
        })
      );
    });

    it("should pass organizationId from team.parentId when workflow belongs to org child team", async () => {
      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-team-123",
          workflowStep: {
            action: "SMS_ATTENDEE",
            workflow: {
              teamId: 50,
              userId: null,
              team: {
                isOrganization: false,
                parentId: 100,
              },
            },
          },
          scheduledDate: new Date(),
          uuid: "uuid-team-123",
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

      await cancelScheduledMessagesAndScheduleEmails({ teamId: 50, userIdsWithNoCredits: [] });

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 100,
        })
      );
    });

    it("should pass null organizationId for personal workflow of non-org user", async () => {
      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-user-123",
          workflowStep: {
            action: "SMS_ATTENDEE",
            workflow: {
              teamId: null,
              userId: 42,
              team: null,
            },
          },
          scheduledDate: new Date(),
          uuid: "uuid-user-123",
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

      await cancelScheduledMessagesAndScheduleEmails({ userIdsWithNoCredits: [42] });

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
        })
      );
    });

    it("should pass organizationId for personal workflow of org member via ProfileRepository lookup", async () => {
      vi.mocked(ProfileRepository.findFirstOrganizationIdForUser).mockResolvedValueOnce(200);

      const mockScheduledMessages = [
        {
          id: 1,
          referenceId: "sms-org-member-123",
          workflowStep: {
            action: "SMS_ATTENDEE",
            workflow: {
              teamId: null,
              userId: 55,
              team: null,
            },
          },
          scheduledDate: new Date(),
          uuid: "uuid-org-member-123",
          booking: {
            attendees: [
              {
                email: "attendee@example.com",
                locale: "en",
              },
            ],
            user: {
              email: "org-member@example.com",
            },
          },
        },
      ];

      prismaMock.workflowReminder.findMany.mockResolvedValue(mockScheduledMessages);
      prismaMock.workflowReminder.updateMany.mockResolvedValue({ count: 1 });

      await cancelScheduledMessagesAndScheduleEmails({ userIdsWithNoCredits: [55] });

      expect(ProfileRepository.findFirstOrganizationIdForUser).toHaveBeenCalledWith({
        userId: 55,
      });

      expect(sendOrScheduleWorkflowEmails).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 200,
        })
      );
    });
  });
});
