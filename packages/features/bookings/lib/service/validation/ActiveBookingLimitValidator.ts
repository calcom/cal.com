import { checkActiveBookingsLimitForBooker } from "../../handleNewBooking/checkActiveBookingsLimitForBooker";
import type { BookingValidationContext, Validator } from "./ValidationPipeline";

export class ActiveBookingLimitValidator implements Validator {
  async validate(ctx: BookingValidationContext): Promise<void> {
    if (ctx.isReschedule) {
      return;
    }

    await checkActiveBookingsLimitForBooker({
      eventTypeId: ctx.eventType.id,
      maxActiveBookingsPerBooker: ctx.eventType.maxActiveBookingsPerBooker,
      bookerEmail: ctx.bookerEmail,
      offerToRescheduleLastBooking: ctx.eventType.maxActiveBookingPerBookerOfferReschedule ?? false,
    });
  }
}
