
import { subscriptions as privateLinkSubscriptions } from "@calcom/features/privateLink/messages/bookingMessageBusRegistration";
import type { IBookingMessageBus } from "./BookingMessageBus";

/**
 * Registers all booking message handlers with the MessageBus
 */
export function registerBookingMessageHandlers(messageBus: IBookingMessageBus): void {
  privateLinkSubscriptions.forEach((subscription) => {
    messageBus.subscribe(subscription);
  });
}
