import { prisma } from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  static async findScheduledMessagesToCancel({
    teamId,
    userIdsWithNoCredits,
  }: {
    teamId?: number | null;
    userIdsWithNoCredits: number[];
  }) {
    return await prisma.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflow: {
            OR: [
              {
                userId: {
                  in: userIdsWithNoCredits,
                },
              },
              ...(teamId ? [{ teamId }] : []),
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
  }

  static async updateRemindersToEmail({ reminderIds }: { reminderIds: number[] }): Promise<void> {
    await prisma.workflowReminder.updateMany({
      where: {
        id: {
          in: reminderIds,
        },
      },
      data: {
        method: WorkflowMethods.EMAIL,
        referenceId: null,
      },
    });
  }

  static async create({
    bookingUid,
    workflowStepId,
    method,
    scheduledDate,
    scheduled,
  }: {
    bookingUid: string;
    workflowStepId: number;
    method: WorkflowMethods;
    scheduledDate: Date;
    scheduled: boolean;
  }) {
    return prisma.workflowReminder.create({
      data: {
        bookingUid,
        workflowStepId,
        method,
        scheduledDate,
        scheduled,
      },
    });
  }
}
