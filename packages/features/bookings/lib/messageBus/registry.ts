import { subscriptions as privateLinkSubscriptions } from "@calcom/features/privateLink/messages/bookingMessageBusRegistration";
import { subscriptions as jobsSubscriptions } from "@calcom/jobs/messages/messageBusRegistration";

import type { BookingMessageBus } from "./BookingMessageBus";

export function registerBookingMessageHandlers(messageBus: BookingMessageBus): void {
  privateLinkSubscriptions.forEach((subscription) => {
    messageBus.subscribe(subscription);
  });

  jobsSubscriptions.forEach((subscription) => {
    messageBus.subscribe(subscription);
  });
}
