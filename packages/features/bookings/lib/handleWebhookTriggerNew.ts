import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";

import { BookingWebhookService } from "@calcom/features/webhooks/lib/services/BookingWebhookService";

const log = logger.getSubLogger({ prefix: ["[handleWebhookTriggerNew]"] });

export interface NewWebhookTriggerArgs {
  trigger: WebhookTriggerEvents;
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime?: Date;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  } | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
  // Event-specific data
  status?: "ACCEPTED" | "PENDING";
  metadata?: { [key: string]: any };
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
  paymentId?: number;
  paymentData?: any;
}

/**
 * New webhook trigger handler that uses the refactored architecture
 * This function delegates to the appropriate service method based on the trigger type
 */
async function _handleWebhookTriggerNew(args: NewWebhookTriggerArgs): Promise<void> {
  try {
    log.debug(`Handling webhook trigger: ${args.trigger}`, {
      bookingId: args.booking.id,
      eventTypeId: args.eventType?.id,
      isDryRun: args.isDryRun,
    });

    switch (args.trigger) {
      case "BOOKING_CREATED":
        await BookingWebhookService.emitBookingCreated({
          evt: args.evt,
          booking: {
            ...args.booking,
            startTime: args.booking.startTime || new Date(),
          },
          eventType: args.eventType,
          status: args.status,
          metadata: args.metadata,
          platformParams: args.platformParams,
          teamId: args.teamId,
          orgId: args.orgId,
          isDryRun: args.isDryRun,
        });
        break;

      case "BOOKING_CANCELLED":
        await BookingWebhookService.emitBookingCancelled({
          evt: args.evt,
          booking: args.booking,
          eventType: args.eventType,
          cancelledBy: args.cancelledBy,
          cancellationReason: args.cancellationReason,
          teamId: args.teamId,
          orgId: args.orgId,
          platformClientId: args.platformClientId,
          isDryRun: args.isDryRun,
        });
        break;

      case "BOOKING_REQUESTED":
        await BookingWebhookService.emitBookingRequested({
          evt: args.evt,
          booking: args.booking,
          eventType: args.eventType,
          teamId: args.teamId,
          orgId: args.orgId,
          platformClientId: args.platformClientId,
          isDryRun: args.isDryRun,
        });
        break;

      case "BOOKING_RESCHEDULED":
        await BookingWebhookService.emitBookingRescheduled({
          evt: args.evt,
          booking: args.booking,
          eventType: args.eventType,
          rescheduleId: args.rescheduleId,
          rescheduleUid: args.rescheduleUid,
          rescheduleStartTime: args.rescheduleStartTime,
          rescheduleEndTime: args.rescheduleEndTime,
          rescheduledBy: args.rescheduledBy,
          teamId: args.teamId,
          orgId: args.orgId,
          platformClientId: args.platformClientId,
          isDryRun: args.isDryRun,
        });
        break;

      case "BOOKING_PAID":
        await BookingWebhookService.emitBookingPaid({
          evt: args.evt,
          booking: args.booking,
          eventType: args.eventType,
          paymentId: args.paymentId,
          paymentData: args.paymentData,
          teamId: args.teamId,
          orgId: args.orgId,
          platformClientId: args.platformClientId,
          isDryRun: args.isDryRun,
        });
        break;

      default:
        log.warn(`Unsupported webhook trigger: ${args.trigger}`, {
          bookingId: args.booking.id,
          eventTypeId: args.eventType?.id,
        });
        break;
    }

    log.debug(`Successfully handled webhook trigger: ${args.trigger}`, {
      bookingId: args.booking.id,
    });
  } catch (error) {
    log.error(`Error handling webhook trigger: ${args.trigger}`, {
      error: error instanceof Error ? error.message : String(error),
      bookingId: args.booking.id,
      eventTypeId: args.eventType?.id,
    });
    throw error;
  }
}

export const handleWebhookTriggerNew = withReporting(_handleWebhookTriggerNew, "handleWebhookTriggerNew");
