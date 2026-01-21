import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getSeatedBooking } from "../../handleNewBooking/getSeatedBooking";
import { getOriginalRescheduledBooking } from "../../handleNewBooking/originalRescheduledBookingUtils";
import { isWithinMinimumRescheduleNotice } from "../../reschedule/isWithinMinimumRescheduleNotice";
import type { BookingValidationContext, Validator } from "./ValidationPipeline";

export class RescheduleNoticeValidator implements Validator {
  async validate(ctx: BookingValidationContext): Promise<void> {
    if (!ctx.rescheduleUid || !ctx.eventType) {
      return;
    }

    const bookingSeat = await getSeatedBooking(ctx.rescheduleUid);
    const actualRescheduleUid = bookingSeat ? bookingSeat.booking.uid : ctx.rescheduleUid;

    if (!actualRescheduleUid) {
      return;
    }

    try {
      const originalRescheduledBooking = await getOriginalRescheduledBooking(
        actualRescheduleUid,
        !!ctx.eventType.seatsPerTimeSlot
      );

      const isUserOrganizer =
        ctx.userId && originalRescheduledBooking.userId && ctx.userId === originalRescheduledBooking.userId;

      const { minimumRescheduleNotice } = originalRescheduledBooking.eventType || {};
      if (
        !isUserOrganizer &&
        isWithinMinimumRescheduleNotice(originalRescheduledBooking.startTime, minimumRescheduleNotice ?? null)
      ) {
        throw new ErrorWithCode(
          ErrorCode.Forbidden,
          "Rescheduling is not allowed within the minimum notice period before the event"
        );
      }
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        throw error;
      }
    }
  }
}
