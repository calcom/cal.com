import * as meta from "@calid/features/modules/workflows/providers/meta";
import { MetaError } from "@calid/features/modules/workflows/providers/meta";
import type { WorkflowContext } from "@calid/job-dispatcher";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { WhatsAppReminderScheduledJobData } from "./type";

const log = logger.getSubLogger({ prefix: ["[job-engine/whatsapp-reminder-scheduled]"] });

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function whatsappReminderScheduledService(
  ctx: WorkflowContext,
  payload: WhatsAppReminderScheduledJobData
): Promise<{ success: boolean; reminderId: number; messageId?: string }> {
  const { reminderId } = payload;

  ctx.log(`Processing WhatsApp reminder ${reminderId}`);

  // Step 1: Send WhatsApp message
  const result = await ctx.run("send-whatsapp-message", async () => {
    try {
      const reminderRecord = await prisma.calIdWorkflowReminder.findUnique({
        where: { id: reminderId },
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

      if (!reminderRecord) {
        throw new Error(`NON_RETRIABLE: Reminder ${reminderId} not found`);
      }

      if (reminderRecord.booking?.status === "REJECTED") {
        throw new Error(`NON_RETRIABLE: Booking ${payload.bookingUid} was rejected, skipping reminder`);
      }

      if (
        reminderRecord.booking?.status === "CANCELLED" &&
        reminderRecord.workflowStep?.workflow.trigger !== "EVENT_CANCELLED"
      ) {
        throw new Error(`NON_RETRIABLE: Booking ${payload.bookingUid} was cancelled, skipping reminder`);
      }

      if (reminderRecord.cancelled) {
        throw new Error(`NON_RETRIABLE: Reminder ${reminderId} was cancelled, skipping reminder`);
      }

      const { recipientNumber } = payload;

      if (!recipientNumber) {
        throw new Error("NON_RETRIABLE: No recipient phone number provided");
      }

      log.info("Sending scheduled WhatsApp reminder", {
        reminderId,
        bookingUid: payload.bookingUid,
        template: payload.template ?? payload.metaTemplateName,
      });

      // Send via Meta WhatsApp API
      // NOTE: Any logic above this call should be idempotent, as due to retries
      // the above code may run several times. Errors below are always non-retriable
      // so no issues there.
      const response = await meta.sendSMS({
        action: payload.action,
        eventTypeId: payload.eventTypeId,
        workflowId: payload.workflowId,
        workflowStepId: payload.workflowStepId,
        phoneNumber: recipientNumber,
        userId: payload.userId,
        teamId: payload.teamId,
        template: payload.template,
        variableData: payload.variableData,
        metaTemplateName: payload.metaTemplateName,
        metaPhoneNumberId: payload.metaPhoneNumberId,
        bookingUid: payload.bookingUid,
        seatReferenceUid: payload.seatReferenceUid,
      });

      if (!response?.messageId) {
        throw new Error("NON_RETRIABLE: Message sent acknowledgement missing messageId");
      }

      // Update reminder with message ID
      await prisma.calIdWorkflowReminder.update({
        where: { id: reminderId },
        data: {
          referenceId: response.messageId,
          scheduled: true,
        },
      });

      log.info("WhatsApp reminder sent successfully", {
        reminderId,
        messageId: response.messageId,
      });

      return {
        messageId: response?.messageId || response?.sid,
        success: true,
      };
    } catch (error) {
      log.error("Failed to send WhatsApp message", {
        reminderId,
        error: error instanceof Error ? error.message : error,
      });

      // Check if it's a non-retriable error (marked with NON_RETRIABLE: prefix)
      if (error instanceof Error && error.message.startsWith("NON_RETRIABLE:")) {
        throw error; // Don't retry
      }

      // MetaError is retriable - throw it to trigger retry
      if (error instanceof MetaError) {
        throw new Error(`Failed to send WhatsApp: ${error.message}`);
      }

      // All other errors are non-retriable
      throw new Error(
        `NON_RETRIABLE: Failed to send WhatsApp: ${error instanceof Error ? error.message : error}`
      );
    }
  });

  if (!result?.messageId) {
    throw new Error("NON_RETRIABLE: WhatsApp reminder sending failed, no messageId returned");
  }

  ctx.log(`WhatsApp reminder sent successfully: ${result.messageId}`);

  return {
    success: true,
    reminderId,
    messageId: result.messageId,
  };
}
