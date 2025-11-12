import type { PrismaClient, Prisma } from "@calcom/prisma/client";
import { WorkflowMethods, WorkflowActions } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByStepId(workflowStepId: number) {
    return await this.prismaClient.workflowReminder.findMany({
      where: { workflowStepId },
      select: {
        id: true,
        referenceId: true,
        method: true,
        booking: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });
  }

  async deleteMany(ids: number[]) {
    if (!ids.length) {
      return { count: 0 };
    }

    return await this.prismaClient.workflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async markAsScheduled(id: number, referenceId: string) {
    return await this.prismaClient.workflowReminder.update({
      where: { id },
      data: { referenceId, scheduled: true },
    });
  }

  async findScheduledSMSByPhoneNumber(phoneNumber: string) {
    return await this.prismaClient.workflowReminder.findMany({
      where: {
        method: WorkflowMethods.SMS,
        cancelled: null,
        scheduledDate: { gte: new Date() },
        booking: { smsReminderNumber: phoneNumber },
        workflowStep: { action: WorkflowActions.SMS_ATTENDEE },
      },
    });
  }

  async findForAIPhoneCallExecution(id: number) {
    const bookingSelect = {
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
    } satisfies Prisma.BookingSelect;

    const select = {
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
      booking: { select: bookingSelect },
    } as const;

    return await this.prismaClient.workflowReminder.findUnique({
      where: { id },
      select,
    });
  }
}
