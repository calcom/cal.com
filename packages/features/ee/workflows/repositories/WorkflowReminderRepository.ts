import prisma, { type PrismaTransaction } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";

export type ScheduledMessageToCancel = {
  referenceId: string | null;
  workflowStep: {
    action: WorkflowActions;
  } | null;
  scheduledDate: Date;
  uuid: string | null;
  id: number;
  booking: {
    attendees: {
      email: string;
      locale: string | null;
    }[];
    user: {
      email: string;
    } | null;
  } | null;
};

export class WorkflowReminderRepository {
  static async findScheduledMessagesToCancel(
    {
      teamId,
      userIdsWithoutCredits,
    }: {
      teamId?: number | null;
      userIdsWithoutCredits: number[];
    },
    tx?: PrismaTransaction
  ): Promise<ScheduledMessageToCancel[]> {
    const prismaClient = tx ?? prisma;

    return await prismaClient.workflowReminder.findMany({
      where: {
        workflowStep: {
          workflow: {
            OR: [
              {
                userId: {
                  in: userIdsWithoutCredits,
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

  static async updateRemindersToEmail(
    { reminderIds }: { reminderIds: number[] },
    tx?: PrismaTransaction
  ): Promise<void> {
    const prismaClient = tx ?? prisma;

    await prismaClient.workflowReminder.updateMany({
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
}
