import type { PrismaClient } from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";
import { WorkflowReminderRepository } from "./workflow-reminder-repository";

describe("WorkflowReminderRepository", () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let repo: WorkflowReminderRepository;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    mockReset(prismaMock);
    repo = new WorkflowReminderRepository(prismaMock);
  });

  describe("create", () => {
    const baseInput = {
      bookingUid: "booking-uid-123",
      workflowStepId: 1,
      method: WorkflowMethods.EMAIL,
      scheduledDate: new Date("2026-02-19T09:00:00.000Z"),
      scheduled: true,
    };

    it("should create a workflow reminder without seatReferenceId when seatReferenceUid is not provided", async () => {
      prismaMock.workflowReminder.create.mockResolvedValue({
        id: 1,
        uuid: "uuid-123",
        bookingUid: baseInput.bookingUid,
        workflowStepId: baseInput.workflowStepId,
        method: baseInput.method,
        scheduledDate: baseInput.scheduledDate,
        scheduled: baseInput.scheduled,
        referenceId: null,
        cancelled: null,
        seatReferenceId: null,
        isMandatoryReminder: false,
        retryCount: 0,
      });

      await repo.create(baseInput);

      expect(prismaMock.workflowReminder.create).toHaveBeenCalledWith({
        data: {
          bookingUid: baseInput.bookingUid,
          workflowStepId: baseInput.workflowStepId,
          method: baseInput.method,
          scheduledDate: baseInput.scheduledDate,
          scheduled: baseInput.scheduled,
        },
      });
    });

    it("should create a workflow reminder with seatReferenceId mapped from seatReferenceUid", async () => {
      const seatReferenceUid = "seat-ref-uuid-456";

      prismaMock.workflowReminder.create.mockResolvedValue({
        id: 2,
        uuid: "uuid-456",
        bookingUid: baseInput.bookingUid,
        workflowStepId: baseInput.workflowStepId,
        method: baseInput.method,
        scheduledDate: baseInput.scheduledDate,
        scheduled: baseInput.scheduled,
        referenceId: null,
        cancelled: null,
        seatReferenceId: seatReferenceUid,
        isMandatoryReminder: false,
        retryCount: 0,
      });

      await repo.create({ ...baseInput, seatReferenceUid });

      expect(prismaMock.workflowReminder.create).toHaveBeenCalledWith({
        data: {
          bookingUid: baseInput.bookingUid,
          workflowStepId: baseInput.workflowStepId,
          method: baseInput.method,
          scheduledDate: baseInput.scheduledDate,
          scheduled: baseInput.scheduled,
          seatReferenceId: seatReferenceUid,
        },
      });
    });

    it("should not include seatReferenceId when seatReferenceUid is an empty string", async () => {
      prismaMock.workflowReminder.create.mockResolvedValue({
        id: 3,
        uuid: "uuid-789",
        bookingUid: baseInput.bookingUid,
        workflowStepId: baseInput.workflowStepId,
        method: baseInput.method,
        scheduledDate: baseInput.scheduledDate,
        scheduled: baseInput.scheduled,
        referenceId: null,
        cancelled: null,
        seatReferenceId: null,
        isMandatoryReminder: false,
        retryCount: 0,
      });

      await repo.create({ ...baseInput, seatReferenceUid: "" });

      expect(prismaMock.workflowReminder.create).toHaveBeenCalledWith({
        data: {
          bookingUid: baseInput.bookingUid,
          workflowStepId: baseInput.workflowStepId,
          method: baseInput.method,
          scheduledDate: baseInput.scheduledDate,
          scheduled: baseInput.scheduled,
        },
      });
    });

    it("should not include seatReferenceId when seatReferenceUid is undefined", async () => {
      prismaMock.workflowReminder.create.mockResolvedValue({
        id: 4,
        uuid: "uuid-101",
        bookingUid: baseInput.bookingUid,
        workflowStepId: baseInput.workflowStepId,
        method: baseInput.method,
        scheduledDate: baseInput.scheduledDate,
        scheduled: baseInput.scheduled,
        referenceId: null,
        cancelled: null,
        seatReferenceId: null,
        isMandatoryReminder: false,
        retryCount: 0,
      });

      await repo.create({ ...baseInput, seatReferenceUid: undefined });

      expect(prismaMock.workflowReminder.create).toHaveBeenCalledWith({
        data: {
          bookingUid: baseInput.bookingUid,
          workflowStepId: baseInput.workflowStepId,
          method: baseInput.method,
          scheduledDate: baseInput.scheduledDate,
          scheduled: baseInput.scheduled,
        },
      });
    });

    it("should return the created workflow reminder", async () => {
      const expectedReminder = {
        id: 5,
        uuid: "uuid-202",
        bookingUid: baseInput.bookingUid,
        workflowStepId: baseInput.workflowStepId,
        method: baseInput.method,
        scheduledDate: baseInput.scheduledDate,
        scheduled: baseInput.scheduled,
        referenceId: null,
        cancelled: null,
        seatReferenceId: null,
        isMandatoryReminder: false,
        retryCount: 0,
      };

      prismaMock.workflowReminder.create.mockResolvedValue(expectedReminder);

      const result = await repo.create(baseInput);

      expect(result).toEqual(expectedReminder);
    });
  });

  describe("findScheduledMessagesToCancel", () => {
    it("should query with userIdsWithNoCredits and without teamId", async () => {
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      await repo.findScheduledMessagesToCancel({
        userIdsWithNoCredits: [1, 2],
      });

      expect(prismaMock.workflowReminder.findMany).toHaveBeenCalledWith({
        where: {
          workflowStep: {
            workflow: {
              OR: [
                {
                  userId: {
                    in: [1, 2],
                  },
                },
              ],
            },
          },
          scheduled: true,
          OR: [{ cancelled: false }, { cancelled: null }],
          referenceId: {
            not: null,
          },
          method: {
            in: [WorkflowMethods.SMS, WorkflowMethods.WHATSAPP],
          },
        },
        select: {
          referenceId: true,
          workflowStep: {
            select: {
              action: true,
              workflow: {
                select: {
                  userId: true,
                  teamId: true,
                  team: {
                    select: {
                      isOrganization: true,
                      parentId: true,
                    },
                  },
                },
              },
            },
          },
          scheduledDate: true,
          uuid: true,
          id: true,
          booking: {
            select: {
              attendees: {
                select: {
                  email: true,
                  locale: true,
                },
              },
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    it("should include teamId in OR condition when teamId is provided", async () => {
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      await repo.findScheduledMessagesToCancel({
        userIdsWithNoCredits: [3],
        teamId: 10,
      });

      const callArg = prismaMock.workflowReminder.findMany.mock.calls[0][0];
      expect(callArg?.where?.workflowStep?.workflow?.OR).toEqual([{ userId: { in: [3] } }, { teamId: 10 }]);
    });

    it("should not include teamId in OR condition when teamId is null", async () => {
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      await repo.findScheduledMessagesToCancel({
        userIdsWithNoCredits: [1],
        teamId: null,
      });

      const callArg = prismaMock.workflowReminder.findMany.mock.calls[0][0];
      expect(callArg?.where?.workflowStep?.workflow?.OR).toEqual([{ userId: { in: [1] } }]);
    });
  });

  describe("updateRemindersToEmail", () => {
    it("should update reminders to EMAIL method and clear referenceId", async () => {
      prismaMock.workflowReminder.updateMany.mockResolvedValue({ count: 3 });

      await repo.updateRemindersToEmail({ reminderIds: [1, 2, 3] });

      expect(prismaMock.workflowReminder.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2, 3],
          },
        },
        data: {
          method: WorkflowMethods.EMAIL,
          referenceId: null,
        },
      });
    });

    it("should return the count of updated reminders", async () => {
      prismaMock.workflowReminder.updateMany.mockResolvedValue({ count: 2 });

      const result = await repo.updateRemindersToEmail({ reminderIds: [4, 5] });

      expect(result).toEqual({ count: 2 });
    });
  });

  describe("findByIdIncludeStepAndWorkflow", () => {
    it("should query by id with correct select fields", async () => {
      prismaMock.workflowReminder.findUnique.mockResolvedValue(null);

      await repo.findByIdIncludeStepAndWorkflow(42);

      expect(prismaMock.workflowReminder.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: {
          seatReferenceId: true,
          workflowStep: {
            select: {
              id: true,
              verifiedAt: true,
              action: true,
              template: true,
              includeCalendarEvent: true,
              reminderBody: true,
              sendTo: true,
              emailSubject: true,
              sender: true,
              numberVerificationPending: true,
              numberRequired: true,
              autoTranslateEnabled: true,
              sourceLocale: true,
              workflow: {
                select: {
                  id: true,
                  name: true,
                  trigger: true,
                  time: true,
                  timeUnit: true,
                  userId: true,
                  teamId: true,
                  team: {
                    select: {
                      isOrganization: true,
                      parentId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it("should return null when reminder is not found", async () => {
      prismaMock.workflowReminder.findUnique.mockResolvedValue(null);

      const result = await repo.findByIdIncludeStepAndWorkflow(999);

      expect(result).toBeNull();
    });
  });

  describe("findFutureScheduledAttendeeSMSReminders", () => {
    it("should find future SMS reminders for phone number", async () => {
      prismaMock.workflowReminder.findMany.mockResolvedValue([]);

      await repo.findFutureScheduledAttendeeSMSReminders("+1234567890");

      expect(prismaMock.workflowReminder.findMany).toHaveBeenCalledWith({
        where: {
          method: WorkflowMethods.SMS,
          cancelled: null,
          scheduledDate: { gte: expect.any(Date) },
          booking: {
            smsReminderNumber: "+1234567890",
          },
          workflowStep: {
            action: "SMS_ATTENDEE",
          },
        },
        select: {
          id: true,
          referenceId: true,
        },
      });
    });
  });

  describe("deleteMany", () => {
    it("should delete reminders by ids", async () => {
      prismaMock.workflowReminder.deleteMany.mockResolvedValue({ count: 2 });

      await repo.deleteMany([1, 2]);

      expect(prismaMock.workflowReminder.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
      });
    });

    it("should return count 0 when ids is empty", async () => {
      const result = await repo.deleteMany([]);

      expect(prismaMock.workflowReminder.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0 });
    });
  });

  describe("findByStepIds", () => {
    it("should find reminders by step ids", async () => {
      const mockReminders = [
        { id: 1, referenceId: "ref-1", method: WorkflowMethods.EMAIL, workflowStepId: 10, booking: { eventTypeId: 5 } },
      ];
      prismaMock.workflowReminder.findMany.mockResolvedValue(mockReminders);

      const result = await repo.findByStepIds([10, 20]);

      expect(prismaMock.workflowReminder.findMany).toHaveBeenCalledWith({
        where: {
          workflowStepId: {
            in: [10, 20],
          },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
          workflowStepId: true,
          booking: {
            select: {
              eventTypeId: true,
            },
          },
        },
      });
      expect(result).toEqual(mockReminders);
    });

    it("should return empty array when step ids is empty", async () => {
      const result = await repo.findByStepIds([]);

      expect(prismaMock.workflowReminder.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("findByIdForAIPhoneCallExecution", () => {
    it("should query with correct select structure for AI phone call", async () => {
      prismaMock.workflowReminder.findUnique.mockResolvedValue(null);

      await repo.findByIdForAIPhoneCallExecution(42);

      expect(prismaMock.workflowReminder.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: {
          id: true,
          scheduled: true,
          referenceId: true,
          workflowStep: {
            select: {
              workflow: {
                select: {
                  trigger: true,
                },
              },
              agent: {
                select: {
                  outboundPhoneNumbers: { select: { phoneNumber: true } },
                  outboundEventTypeId: true,
                },
              },
            },
          },
          booking: {
            select: {
              uid: true,
              startTime: true,
              endTime: true,
              eventTypeId: true,
              responses: true,
              location: true,
              description: true,
              attendees: {
                select: {
                  name: true,
                  email: true,
                  phoneNumber: true,
                  timeZone: true,
                },
              },
              eventType: {
                select: {
                  title: true,
                  bookingFields: true,
                },
              },
              user: {
                select: {
                  name: true,
                  timeZone: true,
                },
              },
            },
          },
        },
      });
    });
  });

  describe("updateReferenceAndScheduled", () => {
    it("should update reference and scheduled fields", async () => {
      const mockReminder = {
        id: 1,
        uuid: "uuid-123",
        bookingUid: "booking-uid",
        workflowStepId: 1,
        method: WorkflowMethods.EMAIL,
        scheduledDate: new Date(),
        scheduled: true,
        referenceId: "new-ref",
        cancelled: null,
        seatReferenceId: null,
        isMandatoryReminder: false,
        retryCount: 0,
      };
      prismaMock.workflowReminder.update.mockResolvedValue(mockReminder);

      await repo.updateReferenceAndScheduled(1, {
        referenceId: "new-ref",
        scheduled: true,
      });

      expect(prismaMock.workflowReminder.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          referenceId: "new-ref",
          scheduled: true,
        },
      });
    });
  });
});
