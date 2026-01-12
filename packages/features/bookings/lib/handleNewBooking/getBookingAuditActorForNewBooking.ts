import {
  makeAttendeeActor,
  makeUserActor,
  makeGuestActor,
} from "@calcom/features/booking-audit/lib/makeActor";
import { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { safeStringify } from "@calcom/lib/safeStringify";
/**
 * Used to create actor for new booking/reschedule booking scenarios
 */
export function getBookingAuditActorForNewBooking({
  bookerAttendeeId,
  actorUserUuid,
  rescheduledBy,
  bookerEmail,
  logger,
  bookerName,
}: {
  bookerAttendeeId: number | null;
  actorUserUuid: string | null;
  bookerEmail: string;
  bookerName: string;
  logger: ISimpleLogger;
  rescheduledBy:
    | {
        attendeeId: number | null;
        email: string;
      }
    | {
        userUuid: string | null;
        email: string;
      }
    | null;
}) {
  if (actorUserUuid) {
    return makeUserActor(actorUserUuid);
  }

  if (rescheduledBy) {
    // If rescheduledBy is available we prefer that above considering booker as the actor
    if ("attendeeId" in rescheduledBy && rescheduledBy.attendeeId) {
      return makeAttendeeActor(rescheduledBy.attendeeId);
    }

    if ("userUuid" in rescheduledBy && rescheduledBy.userUuid) {
      // We consider that a user actor did it without verifying the authorization, so whn taking the action we could record in the context that this action was taken through rescheduledBy contex, similar to how we would do impersonatedBy in context
      // as introduced in PR: https://github.com/calcom/cal.com/pull/26014
      return makeUserActor(rescheduledBy.userUuid);
    }

    return makeGuestActor({ email: rescheduledBy.email, name: rescheduledBy.email });
  }

  if (bookerAttendeeId) {
    return makeAttendeeActor(bookerAttendeeId);
  }

  // Ideally we should have attendeeId atleast but for some unforeseen case we don't, we must create a guest actor.
  logger.warn(
    "Creating guest actor for booking audit",
    safeStringify({
      email: bookerEmail,
    })
  );

  return makeGuestActor({ email: bookerEmail, name: bookerName });
}
