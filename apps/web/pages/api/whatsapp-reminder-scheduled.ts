import * as meta from "@calid/features/modules/workflows/providers/meta";
import { MetaError } from "@calid/features/modules/workflows/providers/meta";
import { NonRetriableError } from "inngest";

import logger from "@calcom/lib/logger";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WorkflowActions, WorkflowMethods } from "@calcom/prisma/enums";
import type { WorkflowTemplates } from "@calcom/prisma/enums";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import type { VariablesType } from "../templates/customTemplate";

const log = logger.getSubLogger({ prefix: ["[inngest-whatsapp-scheduled]"] });

interface WhatsAppReminderData {
  eventTypeId: number;
  workflowId: number | null;
  recipientNumber: string;
  reminderId: number;
  bookingUid: string;
  workflowStepId: number;
  variableData: VariablesType;
  scheduledDate: string;
  userId?: number | null;
  teamId?: number | null;
  template: string | null;
  metaTemplateName: string | null;
  metaPhoneNumberId: string | null;
}

export const whatsappReminderScheduled = async ({ event, step, logger }) => {
  const data = event.data as WhatsAppReminderData;

  // Step 1: Send WhatsApp message
  const result = await step.run("send-whatsapp-message", async () => {
    try {
      const reminderRecord = await prisma.calIdWorkflowReminder.findUnique({
        where: { id: data.reminderId },
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
        throw new NonRetriableError(`Reminder ${data.reminderId} not found`);
      }

      // Check if booking was cancelled
      if (reminderRecord.booking?.status === "CANCELLED" || reminderRecord.booking?.status === "REJECTED") {
        throw new NonRetriableError(`Booking ${data.bookingUid} was cancelled, skipping reminder`);
      }

      const workflowStep = reminderRecord.workflowStep;

      // Get Meta template name and phone number ID from workflow step
      const metaTemplateName = workflowStep?.template ?? reminderRecord.workflowStep?.metaTemplateName;

      // Fetch WhatsApp phone configuration
      const metaPhoneNumberId: string = reminderRecord.workflowStep?.metaTemplatePhoneNumberId;

      const { recipientNumber } = data;
      const recipientPhone = recipientNumber;

      if (!recipientPhone) {
        throw new NonRetriableError("No recipient phone number provided");
      }

      log.info("Sending scheduled WhatsApp reminder", {
        reminderId: data.reminderId,
        bookingUid: data.bookingUid,
        template: data.template ?? data.metaTemplateName,
      });

      // NOTE
      // Any logic above this call should be idempotent, as due to retries the above code may run several times.
      // Errors below are always non-retriable so no issues there.
      const response = await meta.sendSMS({
        eventTypeId: data.eventTypeId,
        workflowId: data.workflowId,
        phoneNumber: recipientPhone,
        userId: data.userId,
        teamId: data.teamId,
        template: data.template,
        variableData: data.variableData,
        metaTemplateName: data.metaTemplateName,
        metaPhoneNumberId: data.metaPhoneNumberId,
      });

      if(!response.messageId) {
        throw new Error("Message sent acknowledgement missing messageId");
      }

      await prisma.calIdWorkflowReminder.update({
        where: { id: data.reminderId },
        data: {
          referenceId: response.messageId,
          scheduled: true,
        },
      });

      log.info("WhatsApp reminder sent successfully", {
        reminderId: data.reminderId,
        messageId: response.messageId,
      });

      return {
        messageId: response?.messageId || response?.sid,
        success: true,
      };
    } catch (error) {
      log.error("Failed to send WhatsApp message", {
        reminderId: data.reminderId,
        error: error instanceof Error ? error.message : error,
      });

      if (error instanceof NonRetriableError) {
        throw error;
      } else if (error instanceof MetaError) {
        throw new Error(`Failed to send WhatsApp: ${error instanceof Error ? error.message : error}`);
      } else {
        throw new NonRetriableError(
          `Failed to send WhatsApp: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  });

  return {
    success: true,
    reminderId: data.reminderId,
    messageId: result.messageId,
  };
};

// Cancellation function
export const cancelWhatsappReminder = async ({ event, step }) => {
  const { reminderId } = event.data as { reminderId: number };

  await step.run("mark-reminder-cancelled", async () => {
    try {
      await prisma.calIdWorkflowReminder.update({
        where: { id: reminderId },
        data: {
          scheduled: false,
          referenceId: "CANCELLED",
        },
      });

      log.info("WhatsApp reminder cancelled", { reminderId });
    } catch (error) {
      log.error("Failed to cancel reminder", {
        reminderId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  });

  return { success: true, reminderId };
};
