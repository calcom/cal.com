import { MessageBookingCreatedPrivateLinkHandler } from "./booking.created/MessageBookingCreatedPrivateLinkHandler";
import { MessageBookingRescheduledPrivateLinkHandler } from "./booking.rescheduled/MessageBookingRescheduledPrivateLinkHandler";

export const subscriptions = [
  new MessageBookingCreatedPrivateLinkHandler(),
  new MessageBookingRescheduledPrivateLinkHandler(),
];
