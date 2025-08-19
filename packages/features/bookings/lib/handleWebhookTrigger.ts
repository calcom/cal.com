import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { WebhookTriggerEvents as WebhookTriggerEventsEnum } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import logger from "@calcom/lib/logger";
import { withReporting } from "@calcom/lib/sentryWrapper";

import { BookingWebhookService, type WebhookTriggerArgs } from "@calcom/features/webhooks/lib/service/BookingWebhookService";

const log = logger.getSubLogger({ prefix: ["[handleWebhookTrigger]"] });

// Re-export the interface for backward compatibility
export type { WebhookTriggerArgs };

/**
 * Webhook trigger handler that uses the refactored architecture
 * This function delegates to the appropriate service method based on the trigger type
 */
async function _handleWebhookTrigger(args: WebhookTriggerArgs): Promise<void> {
  try {
    log.debug(`Handling webhook trigger: ${args.trigger}`, {
      bookingId: args.booking.id,
      eventTypeId: args.eventType?.id,
      isDryRun: args.isDryRun,
    });

    switch (args.trigger) {
      case WebhookTriggerEventsEnum.BOOKING_CREATED:
        await BookingWebhookService.emitBookingCreatedFromArgs(args);
        break;

      case WebhookTriggerEventsEnum.BOOKING_CANCELLED:
        await BookingWebhookService.emitBookingCancelledFromArgs(args);
        break;

      case WebhookTriggerEventsEnum.BOOKING_REQUESTED:
        await BookingWebhookService.emitBookingRequestedFromArgs(args);
        break;

      case WebhookTriggerEventsEnum.BOOKING_RESCHEDULED:
        await BookingWebhookService.emitBookingRescheduledFromArgs(args);
        break;

      case WebhookTriggerEventsEnum.BOOKING_PAID:
        await BookingWebhookService.emitBookingPaidFromArgs(args);
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

export const handleWebhookTrigger = withReporting(_handleWebhookTrigger, "handleWebhookTrigger");