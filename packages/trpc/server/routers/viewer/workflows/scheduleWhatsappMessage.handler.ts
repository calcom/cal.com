import { PrismaClient } from "@prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import { INNGEST_ID } from "@calcom/lib/constants";
import { inngestClient } from "@calcom/web/pages/api/inngest";
import { TScheduleWhatsappMessageInputSchema } from "./scheduleWhatsappMessage.schema";

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
  // These are reminders that were stored in the DB but not yet scheduled with Meta
  // (because Meta doesn't support native scheduling like Twilio does)
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
            teamId: calIdTeamId,
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
      scheduled: 0
    };
  }

  // Determine Inngest environment key
  const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

  // Schedule each reminder with Inngest
  const schedulePromises = pendingReminders.map(async (reminder) => {
    const { booking, workflowStep, scheduledDate, id: reminderId } = reminder;

    if (!booking || !workflowStep) {
      return null;
    }

    // Calculate delay until scheduled time
    const now = new Date();
    const delay = Math.max(0, scheduledDate.getTime() - now.getTime());

    try {
      // Send event to Inngest with delay
      await inngestClient.send({
        name: `whatsapp/reminder.scheduled-${key}`,
        data: {
          reminderId,
          bookingUid: booking.uid,
          workflowStepId: workflowStep.id,
          scheduledDate: scheduledDate.toISOString(),
          attendee: {
            name: booking.attendees[0]?.name || "",
            email: booking.attendees[0]?.email || "",
            timeZone: booking.attendees[0]?.timeZone || "UTC",
          },
          organizer: {
            name: booking.user?.name || "",
            email: booking.user?.email || "",
            timeZone: booking.user?.timeZone || "UTC",
            locale: booking.user?.locale || "en",
            timeFormat: booking.user?.timeFormat || 12,
          },
          event: {
            title: booking.eventType?.title || booking.title,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            eventTypeId: booking.eventType?.id,
          },
          workflow: {
            action: workflowStep.action,
            template: workflowStep.template,
            sendTo: workflowStep.sendTo,
          },
          userId: workflowStep.workflow.userId,
          teamId: workflowStep.workflow.teamId,
        },
        ts: delay > 0 ? now.getTime() + delay : undefined,
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
        referenceId: "INNGEST_SCHEDULED", // Marker that it's scheduled via Inngest
      },
    });
  }

  return {
    message: `Successfully scheduled ${scheduledIds.length} WhatsApp reminders`,
    scheduled: scheduledIds.length,
    total: pendingReminders.length,
  };
};
