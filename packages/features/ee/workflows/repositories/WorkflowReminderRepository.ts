// import { prisma as this.prismaClient } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import { WorkflowMethods } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findScheduledMessagesToCancel({
    teamId,
    userIdsWithNoCredits,
  }: {
    teamId?: number | null;
    userIdsWithNoCredits: number[];
  }) {
    return this.prismaClient.workflowReminder.findMany({
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

  async updateRemindersToEmail({ reminderIds }: { reminderIds: number[] }) {
    return this.prismaClient.workflowReminder.updateMany({
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

  async create({
    bookingUid,
    workflowStepId,
    method,
    scheduledDate,
    scheduled,
    seatReferenceUid,
  }: {
    bookingUid: string;
    workflowStepId: number;
    method: WorkflowMethods;
    scheduledDate: Date;
    scheduled: boolean;
    seatReferenceUid?: string;
  }) {
    return this.prismaClient.workflowReminder.create({
      data: {
        bookingUid,
        workflowStepId,
        method,
        scheduledDate,
        scheduled,
        ...(seatReferenceUid && { seatReferenceUid }),
      },
    });
  }

  findByIdIncludeStepAndWorkflow(id: number) {
    return this.prismaClient.workflowReminder.findUnique({
      where: {
        id,
      },
      include: {
        workflowStep: {
          include: {
            workflow: true,
          },
        },
      },
    });
  }
}
