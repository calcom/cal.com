import { noShowAction } from "./noShow";
import { bookingCreatedAction } from "./bookingCreated"; // example
// ... other imports

export const zapierActions = [
  bookingCreatedAction,
  bookingRescheduledAction,
  bookingCancelledAction,
  bookingConfirmedAction,
  bookingDeclinedAction,
  bookingRequestedAction,
  bookingPaymentInitiatedAction,
  noShowAction, // Added in alphabetical/chronological order
] as const;