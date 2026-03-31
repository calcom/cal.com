import { HttpError } from "@calcom/lib/http-error";

import { isWithinMinimumRescheduleNotice } from "../reschedule/isWithinMinimumRescheduleNotice";
import { getSeatedBooking } from "./getSeatedBooking";
import { getOriginalRescheduledBooking } from "./originalRescheduledBookingUtils";

export async function validateRescheduleRestrictions({
  rescheduleUid,
  userId,
  eventType,
}: {
  rescheduleUid: string | null | undefined;
  userId: number | null;
  eventType: { seatsPerTimeSlot: number | null; minimumRescheduleNotice: number | null } | null;
}): Promise<void> {
  if (!rescheduleUid || !eventType) {
    return;
  }

  const bookingSeat = rescheduleUid ? await getSeatedBooking(rescheduleUid) : null;
  const actualRescheduleUid = bookingSeat ? bookingSeat.booking.uid : rescheduleUid;

  if (!actualRescheduleUid) {
    return;
  }

  try {
    const originalRescheduledBooking = await getOriginalRescheduledBooking(
      actualRescheduleUid,
      !!eventType.seatsPerTimeSlot
    );

    const isUserOrganizer =
      userId && originalRescheduledBooking.userId && userId === originalRescheduledBooking.userId;

    const { minimumRescheduleNotice } = originalRescheduledBooking.eventType || {};
    if (
      !isUserOrganizer &&
      isWithinMinimumRescheduleNotice(originalRescheduledBooking.startTime, minimumRescheduleNotice ?? null)
    ) {
      throw new HttpError({
        statusCode: 403,
        message: "Rescheduling is not allowed within the minimum notice period before the event",
      });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
  }
}
