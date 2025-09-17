import type { IMessageHandler } from "@calcom/lib/messageBus/MessageBus";
import { BaseMessageBus } from "@calcom/lib/messageBus/MessageBus";

import type { BookingMessage, BookingMessagePayloadMap } from "./types.d";

export type { BookingCreatedMessagePayload, BookingRescheduledMessagePayload } from "./types.d";
export { BOOKING_MESSAGES } from "./types.d";

export type { BookingMessage };

// Booking-specific message handler interface
export interface IBookingMessageHandler<T extends BookingMessage>
  extends IMessageHandler<T, BookingMessagePayloadMap> {
  subscribedMessage: T;
  handle(payload: BookingMessagePayloadMap[T]): Promise<void>;
  isEnabled?(payload: BookingMessagePayloadMap[T]): boolean;
}

// Booking-specific message bus interface
export interface IBookingMessageBus {
  emit<T extends BookingMessage>(messageType: T, payload: BookingMessagePayloadMap[T]): Promise<void>;
  subscribe<T extends BookingMessage>(handler: IBookingMessageHandler<T>): void;
  unsubscribe<T extends BookingMessage>(handler: IBookingMessageHandler<T>): void;
}

export class BookingMessageBus
  extends BaseMessageBus<BookingMessage, BookingMessagePayloadMap>
  implements IBookingMessageBus
{
  constructor() {
    super(["BookingMessageBus"]);
  }

  subscribe<T extends BookingMessage>(handler: IBookingMessageHandler<T>): void {
    super.subscribe(handler);
  }

  unsubscribe<T extends BookingMessage>(handler: IBookingMessageHandler<T>): void {
    super.unsubscribe(handler);
  }
}
