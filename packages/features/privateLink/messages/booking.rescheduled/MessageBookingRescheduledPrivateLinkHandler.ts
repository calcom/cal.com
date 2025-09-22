import { BOOKING_MESSAGES } from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import type {
  IBookingMessageHandler,
  BookingRescheduledMessagePayload,
} from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import logger from "@calcom/lib/logger";
import type { Message } from "@calcom/lib/messageBus/MessageBus";

import { updateHashedLinkUsage } from "../../lib/updateHashedLinkUsage";

const log = logger.getSubLogger({ prefix: ["HashedLinkHandler"] });

export class MessageBookingRescheduledPrivateLinkHandler
  implements IBookingMessageHandler<typeof BOOKING_MESSAGES.BOOKING_RESCHEDULED>
{
  subscribedMessage = BOOKING_MESSAGES.BOOKING_RESCHEDULED;

  isEnabled(message: Message<BookingRescheduledMessagePayload>): boolean {
    return !message.payload.config.isDryRun;
  }

  async handle(message: Message<BookingRescheduledMessagePayload>): Promise<void> {
    const { payload } = message;
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
