import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { INNGEST_ID } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import { constructVariablesForTemplate } from "../../managers/constructTemplateVariable";
import type { PartialCalIdWorkflowReminder } from "../../utils/getWorkflows";
import { select } from "../../utils/getWorkflows";

const log = logger.getSubLogger({ prefix: ["[whatsappQueueHandler]"] });

/**
 * Fetches reminders that need to be scheduled via Inngest
 * These are reminders that were stored as "scheduled: false" and are now within the 7-day window
 */
const fetchPendingMessages = async () => {
  return prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: false,
      scheduledDate: {
        lte: dayjs().add(7, "day").toISOString(),
        gte: dayjs().toISOString(),
      },
      OR: [{ cancelled: null }, { cancelled: false }],
    },
    select,
  });
};

/**
 * Process messages that need to be scheduled through Inngest
 * This handles reminders that were stored for future scheduling
 */
const processMessageQueue = async (): Promise<number> => {
  const pendingMessages = (await fetchPendingMessages()) as PartialCalIdWorkflowReminder[];

  log.info(`Processing ${pendingMessages.length} pending WhatsApp reminders`);

  for (const message of pendingMessages) {
    if (!message.workflowStep || !message.booking) {
      log.warn(`Skipping message ${message.id} - missing workflowStep or booking`);
      continue;
    }

    const workflowUserId = message.workflowStep.workflow.userId;
    const workflowTeamId = message.workflowStep.workflow.calIdTeamId;

    try {
      // Determine recipient number based on action
      const recipientNumber =
        message.workflowStep.action === WorkflowActions.WHATSAPP_NUMBER
          ? message.workflowStep.sendTo
          : message.booking?.smsReminderNumber;

      if (!recipientNumber) {
        log.warn(`No recipient number for message ${message.id}`);
        continue;
      }

      // Find the attendee for this reminder (if seatReferenceId exists)
      const targetAttendee = message.seatReferenceId
        ? message.booking.attendees.find((att) => att.id === message.attendeeId)
        : message.booking.attendees[0];

      if (!targetAttendee) {
        log.warn(`No attendee found for message ${message.id}`);
        continue;
      }

      // Determine timezone based on action
      const participantTimeZone =
        message.workflowStep.action === WorkflowActions.WHATSAPP_ATTENDEE
          ? targetAttendee.timeZone
          : message.booking.user?.timeZone || "UTC";

      // Get Meta template configuration
      const metaTemplateName = message.workflowStep.metaTemplateName;
      const metaPhoneNumberId = message.workflowStep.metaPhoneNumberId;

      // Construct template variables
      const templateVariables = constructVariablesForTemplate(
        {
          uid: message.booking.uid,
          eventTypeId: message.booking.eventTypeId,
          eventType: message.booking.eventType,
          startTime: message.booking.startTime.toISOString(),
          endTime: message.booking.endTime.toISOString(),
          organizer: {
            name: message.booking.user?.name || "Organizer",
            email: message.booking.user?.email || "",
            timeZone: message.booking.user?.timeZone || "UTC",
          },
          attendees: message.booking.attendees.map((att) => ({
            name: att.name,
            email: att.email,
            timeZone: att.timeZone,
            phoneNumber: att.phoneNumber,
          })),
        },
        targetAttendee,
        message.booking.startTime.toISOString(),
        message.booking.endTime.toISOString(),
        participantTimeZone,
        message.booking.metadata?.bookerUrl || process.env.NEXT_PUBLIC_WEBAPP_URL || ""
      );

      // Calculate delay until scheduled time
      const now = new Date();
      const scheduledDate = new Date(message.scheduledDate);
      const delay = Math.max(0, scheduledDate.getTime() - now.getTime());

      // Determine Inngest environment key
      const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

      log.debug(`Scheduling WhatsApp reminder ${message.id} via Inngest`, {
        reminderId: message.id,
        scheduledDate: scheduledDate.toISOString(),
        delayMinutes: delay / 1000 / 60,
      });

      // Send to Inngest for scheduling
      const { ids } = await inngestClient.send({
        name: `whatsapp/reminder.scheduled-${key}`,
        data: {
          eventTypeId: message.booking.eventTypeId,
          workflowId: message.workflowStep.workflowId,
          recipientNumber,
          reminderId: message.id,
          bookingUid: message.bookingUid,
          workflowStepId: message.workflowStepId,
          scheduledDate: scheduledDate.toISOString(),
          variableData: templateVariables,
          userId: workflowUserId,
          teamId: workflowTeamId,
          template: message.workflowStep.template,
          metaTemplateName,
          metaPhoneNumberId,
        },
        ts: delay > 0 ? now.getTime() + delay : undefined,
      });

      // Update reminder as scheduled
      await prisma.calIdWorkflowReminder.update({
        where: { id: message.id },
        data: {
          scheduled: true,
          referenceId: ids[0],
        },
      });

      log.info(`Successfully scheduled WhatsApp reminder ${message.id} via Inngest`);
    } catch (error) {
      log.error(`Failed to schedule WhatsApp reminder ${message.id}`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  return pendingMessages.length;
};

/**
 * Handle cancellations for messages that were scheduled but now need to be cancelled
 * This sends cancellation events to Inngest
 */
const executeCancellationProcess = async (): Promise<void> => {
  const messagesToCancel = await prisma.calIdWorkflowReminder.findMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduled: true,
      cancelled: true,
      referenceId: {
        not: null,
        notIn: ["CANCELLED"],
      },
    },
  });

  log.info(`Processing ${messagesToCancel.length} WhatsApp reminder cancellations`);

  const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

  for (const messageToCancel of messagesToCancel) {
    try {
      if (!messageToCancel.referenceId) continue;

      // Send cancellation event to Inngest
      await inngestClient.send({
        name: `whatsapp/reminder.cancelled-${key}`,
        data: {
          reminderId: messageToCancel.id,
        },
      });

      // Update database to reflect cancellation
      await prisma.calIdWorkflowReminder.update({
        where: { id: messageToCancel.id },
        data: {
          referenceId: "CANCELLED",
          scheduled: false,
        },
      });

      log.debug(`Cancelled WhatsApp reminder ${messageToCancel.id}`);
    } catch (error) {
      log.error(`Failed to cancel WhatsApp reminder ${messageToCancel.id}`, {
        error: error instanceof Error ? error.message : error,
      });
    }
  }
};

/**
 * Clean up old reminders that are past their scheduled date and no longer needed
 * This prevents the database from growing indefinitely
 */
const cleanupExpiredReminders = async (): Promise<void> => {
  const cutoffDate = dayjs().subtract(7, "days").toISOString();

  const result = await prisma.calIdWorkflowReminder.deleteMany({
    where: {
      method: WorkflowMethods.WHATSAPP,
      scheduledDate: {
        lt: cutoffDate,
      },
      OR: [
        { scheduled: true, cancelled: false },
        { scheduled: false, cancelled: true },
        { referenceId: "CANCELLED" },
      ],
    },
  });

  if (result.count > 0) {
    log.info(`Cleaned up ${result.count} expired WhatsApp reminders`);
  }
};

/**
 * Main cron handler
 * This cron now primarily handles:
 * 1. Scheduling reminders that were stored for future (beyond 7 days) that are now within window
 * 2. Processing cancellations for already-scheduled reminders
 * 3. Cleanup of old reminder records
 */
export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (!process.env.CRON_API_KEY || authorizationHeader !== `${process.env.CRON_API_KEY}`) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    log.info("Starting WhatsApp queue processing");

    // Execute all operations
    await executeCancellationProcess();
    const scheduledCount = await processMessageQueue();
    // await cleanupExpiredReminders();

    log.info("WhatsApp queue processing completed", {
      scheduledCount,
    });

    return NextResponse.json(
      {
        message: `WhatsApp queue processed successfully`,
        scheduledCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("Error in WhatsApp queue processing", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}