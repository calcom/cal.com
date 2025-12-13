import { makeAttendeeActor, makeUserActor, makeGuestActor } from "../types/actor";
import { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { safeStringify } from "@calcom/lib/safeStringify";
/**
 * Used to create actor for new booking/reschedule booking scenarios
 */
export function getBookingAuditActorForNewBooking({
    attendeeId,
    userUuid,
    bookerEmail,
    logger,
    bookerName,
}: {
    attendeeId: number | null;
    userUuid: string | null;
    bookerEmail: string;
    bookerName: string;
    logger: ISimpleLogger;
}) {
    if (userUuid) {
        return makeUserActor(userUuid);
    }

    if (attendeeId) {
        return makeAttendeeActor(attendeeId);
    }

    // Ideally we should have attendeeId atleast but for some unforeseen case we don't, we must create a guest actor.
    logger.warn("Creating guest actor for booking audit", safeStringify({
        email: bookerEmail,
    }));

    return makeGuestActor({ email: bookerEmail, name: bookerName });
}