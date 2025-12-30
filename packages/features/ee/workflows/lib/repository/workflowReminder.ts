import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowMethods, WorkflowActions } from "@calcom/prisma/enums";

export class WorkflowReminderRepository {
  static getFutureScheduledAttendeeSMSReminders(phoneNumber: string) {
    return prisma.workflowReminder.findMany({
      where: {
        method: WorkflowMethods.SMS,
        cancelled: null,
        scheduledDate: { gte: new Date() },
        booking: {
          smsReminderNumber: phoneNumber,
        },
        workflowStep: {
          action: WorkflowActions.SMS_ATTENDEE,
        },
      },
    });
  }

  static deleteWorkflowReminders(ids: number[]) {
    if (!ids.length) {
      return [];
    }

    return prisma.workflowReminder.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  static async findWorkflowRemindersByStepId(workflowStepId: number) {
    return await prisma.workflowReminder.findMany({
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

  static async findWorkflowRemindersByStepIds(workflowStepIds: number[]) {
    if (workflowStepIds.length === 0) {
      return [];
    }

    return await prisma.workflowReminder.findMany({
      where: {
        workflowStepId: {
          in: workflowStepIds,
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
  }

  static async findWorkflowReminderForAIPhoneCallExecution(id: number) {
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

    return await prisma.workflowReminder.findUnique({
      where: { id },
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
        booking: { select: bookingSelect },
      },
    });
  }

  static async updateWorkflowReminderReferenceAndScheduled(
    id: number,
    data: {
      referenceId: string;
      scheduled: boolean;
    }
  ) {
    return await prisma.workflowReminder.update({
      where: { id },
      data,
    });
  }
}
