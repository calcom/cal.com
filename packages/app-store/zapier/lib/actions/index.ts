import { bookingCreatedAction } from "./bookingCreated";
import { bookingRescheduledAction } from "./bookingRescheduled";
import { bookingCancelledAction } from "./bookingCancelled";
import { meetingEndedAction } from "./meetingEnded";
import { noShowAction } from "./noShow";

export const zapierActions = [
  bookingCreatedAction,
  bookingRescheduledAction,
  bookingCancelledAction,
  meetingEndedAction,
  noShowAction,
];
