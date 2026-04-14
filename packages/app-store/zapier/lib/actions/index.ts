import { bookingCreatedAction } from "./bookingCreated";
import { bookingCancelledAction } from "./bookingCancelled";
import { bookingRescheduledAction } from "./bookingRescheduled";
import { meetingEndedAction } from "./meetingEnded";
import { noShowAction } from "./noShow";

export const zapierActions = [
  bookingCreatedAction,
  bookingCancelledAction,
  bookingRescheduledAction,
  meetingEndedAction,
  noShowAction,
];
