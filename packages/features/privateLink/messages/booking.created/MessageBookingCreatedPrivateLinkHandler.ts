import { BOOKING_MESSAGES } from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import type {
  IBookingMessageHandler,
  BookingCreatedMessagePayload,
} from "@calcom/features/bookings/lib/messageBus/BookingMessageBus";
import logger from "@calcom/lib/logger";
import type { Message } from "@calcom/lib/messageBus/types";

import { updateHashedLinkUsage } from "../../lib/updateHashedLinkUsage";

const log = logger.getSubLogger({ prefix: ["HashedLinkHandler"] });
export class MessageBookingCreatedPrivateLinkHandler
  implements IBookingMessageHandler<typeof BOOKING_MESSAGES.BOOKING_CREATED>
{
  subscribedMessage = BOOKING_MESSAGES.BOOKING_CREATED;

  isEnabled(message: Message<BookingCreatedMessagePayload>): boolean {
    console.log("MessageBookingCreatedPrivateLinkHandler isEnabled - Checking", {
      config: message.payload.config,
    });
    return !message.payload.config.isDryRun;
  }

  async handle(message: Message<BookingCreatedMessagePayload>): Promise<void> {
    console.log("MessageBookingCreatedPrivateLinkHandler handle - Handling", {
      payload: message.payload,
    });
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
