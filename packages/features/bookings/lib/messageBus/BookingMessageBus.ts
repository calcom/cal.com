import { BaseMessageBus } from "@calcom/lib/messageBus/MessageBus";
import type { IMessageHandler, Message } from "@calcom/lib/messageBus/types";

import type { BookingMessage, BookingMessagePayloadMap } from "./types.d";

export type { BookingCreatedMessagePayload, BookingRescheduledMessagePayload } from "./types.d";
export { BOOKING_MESSAGES } from "./types.d";

export type { BookingMessage };

// Booking-specific message handler interface
export interface IBookingMessageHandler<T extends BookingMessage>
  extends IMessageHandler<T, BookingMessagePayloadMap> {
  subscribedMessage: T;
  handle(message: Message<BookingMessagePayloadMap[T]>): Promise<void>;
  isEnabled?(message: Message<BookingMessagePayloadMap[T]>): boolean;
}

export class BookingMessageBus extends BaseMessageBus<BookingMessage, BookingMessagePayloadMap> {
  constructor() {
    super(["BookingMessageBus"]);
  }
}
