import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import { getCancelLink, getRescheduleLink } from "@calcom/lib/CalEventParser";
import { BookingStatus } from "@calcom/prisma/enums";

const BOOKING_WEBHOOK_STATUS_ACCEPTED = BookingStatus.ACCEPTED;

/**
 * Adds public booking management URLs to webhook payloads when the booking is in an accepted state.
 */
export const addBookingManagementUrlsToWebhookPayload = (
  payload: EventPayloadType
): EventPayloadType & { cancellationUrl?: string; rescheduleUrl?: string } => {
  if (payload.status !== BOOKING_WEBHOOK_STATUS_ACCEPTED || !payload.uid) {
    return payload;
  }

  const urls: { cancellationUrl?: string; rescheduleUrl?: string } = {};

  if (!payload.disableCancelling) {
    try {
      const cancellationUrl = getCancelLink(payload);
      if (cancellationUrl) {
        urls.cancellationUrl = cancellationUrl;
      }
    } catch {
      // Keep webhook payload resilient if URL building fails for malformed event data.
    }
  }

  if (!payload.disableRescheduling) {
    try {
      const rescheduleUrl = getRescheduleLink({ calEvent: payload });
      if (rescheduleUrl) {
        urls.rescheduleUrl = rescheduleUrl;
      }
    } catch {
      // Keep webhook payload resilient if URL building fails for malformed event data.
    }
  }

  return {
    ...payload,
    ...urls,
  };
};
