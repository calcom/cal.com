import { bookingCancelledAction } from "./bookingCancelled";
import { bookingCreatedAction } from "./bookingCreated";
import { bookingRescheduledAction } from "./bookingRescheduled";
import { noShowAction } from "./noShow";

export const zapierActions = [
  bookingCreatedAction,
  bookingRescheduledAction,
  bookingCancelledAction,
  noShowAction,
];
