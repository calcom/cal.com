import { dispatcher, JobName } from "@calid/job-dispatcher";
import type { WhatsAppReminderScheduledJobData } from "@calid/job-engine/types";
import { QueueName } from "@calid/queue";
import type { PrismaClient } from "@prisma/client";

import type { TrpcSessionUser } from "@calcom/trpc/server";

import type { TScheduleWhatsappMessageInputSchema } from "./scheduleWhatsappMessage.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TScheduleWhatsappMessageInputSchema;
};

export const scheduleWhatsappMessageHandler = async ({ ctx, input }: GetOptions) => {
  const { user, prisma } = ctx;
  const { calIdTeamId } = input;

  // Fetch pending scheduled WhatsApp reminders that need to be processed
  // These are reminders that were stored in the DB but not yet scheduled
  const pendingReminders = await prisma.calIdWorkflowReminder.findMany({
    where: {
      method: "WHATSAPP",
      scheduled: false, // Not yet scheduled with provider
      scheduledDate: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Within next 7 days
        gte: new Date(), // Future date
      },
      referenceId: null, // No provider reference ID yet
      ...(calIdTeamId && {
        workflowStep: {
          workflow: {
            calIdTeamId: calIdTeamId,
          },
        },
      }),
    },
    include: {
      booking: {
        include: {
          attendees: true,
          eventType: true,
          user: true,
        },
      },
      workflowStep: {
        include: {
          workflow: true,
        },
      },
    },
  });

  if (pendingReminders.length === 0) {
    return {
      message: "No pending WhatsApp reminders to schedule",
      scheduled: 0,
    };
  }

  // Schedule each reminder
  const schedulePromises = pendingReminders.map(async (reminder) => {
    const { booking, workflowStep, scheduledDate, id: reminderId } = reminder;

    if (!booking || !workflowStep || !booking.eventTypeId) {
      return null;
    }

    // Calculate delay until scheduled time
    const now = new Date();
    const delay = Math.max(0, scheduledDate.getTime() - now.getTime());

    try {
      const payload: WhatsAppReminderScheduledJobData = {
        action: workflowStep.action,
        eventTypeId: booking.eventTypeId,
        workflowId: workflowStep.workflow.id,
        workflowStepId: workflowStep.id,
        recipientNumber: workflowStep.sendTo || booking.attendees[0]?.phoneNumber || "",
        reminderId,
        bookingUid: booking.uid,
        scheduledDate: scheduledDate.toISOString(),
        variableData: {} as any, // Will be reconstructed in job
        userId: workflowStep.workflow.userId,
        teamId: workflowStep.workflow.calIdTeamId,
        template: workflowStep.template,
        metaTemplateName: workflowStep.metaTemplateName,
        metaPhoneNumberId: workflowStep.metaTemplatePhoneNumberId,
        seatReferenceUid: reminder.seatReferenceId,
      };

      // Dispatch job
      await dispatcher.dispatch({
        queue: QueueName.SCHEDULED,
        name: JobName.WHATSAPP_REMINDER_SCHEDULED,
        data: payload,
        bullmqOptions: {
          delay,
          attempts: 2,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
        inngestTs: Date.now() + delay,
      });

      return reminderId;
    } catch (error) {
      console.error(`Failed to schedule reminder ${reminderId}:`, error);
      return null;
    }
  });

  const scheduledIds = (await Promise.all(schedulePromises)).filter(Boolean);

  // Update reminders to mark them as scheduled
  if (scheduledIds.length > 0) {
    await prisma.calIdWorkflowReminder.updateMany({
      where: {
        id: {
          in: scheduledIds as number[],
        },
      },
      data: {
        scheduled: true,
        referenceId: "DISPATCHER_SCHEDULED",
      },
    });
  }

  return {
    message: `Successfully scheduled ${scheduledIds.length} WhatsApp reminders`,
    scheduled: scheduledIds.length,
    total: pendingReminders.length,
  };
};
