import { BOOKING_MESSAGES } from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import type {
  IBookingMessageHandler,
  BookingCreatedMessagePayload,
} from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import logger from "@calcom/lib/logger";

import { updateHashedLinkUsage } from "../../lib/updateHashedLinkUsage";

const log = logger.getSubLogger({ prefix: ["HashedLinkHandler"] });
export class MessageBookingCreatedPrivateLinkHandler
  implements IBookingMessageHandler<typeof BOOKING_MESSAGES.BOOKING_CREATED>
{
  subscribedMessage = BOOKING_MESSAGES.BOOKING_CREATED;

  isEnabled(payload: BookingCreatedMessagePayload): boolean {
    return !payload.config.isDryRun;
  }

  async handle(payload: BookingCreatedMessagePayload): Promise<void> {
    if (!payload.eventType.hashedLink) {
      return;
    }
    await updateHashedLinkUsage(
      {
        hashedLink: payload.eventType.hashedLink,
        bookingUid: payload.booking.uid,
      },
      {
        log,
      }
    );
  }
}
