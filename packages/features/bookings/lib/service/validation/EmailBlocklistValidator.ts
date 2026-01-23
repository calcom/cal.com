import { checkIfBookerEmailIsBlocked } from "../../handleNewBooking/checkIfBookerEmailIsBlocked";
import type { BookingValidationContext, Validator } from "./ValidationPipeline";

export class EmailBlocklistValidator implements Validator {
  async validate(ctx: BookingValidationContext): Promise<void> {
    await checkIfBookerEmailIsBlocked({
      loggedInUserId: ctx.userId ?? undefined,
      bookerEmail: ctx.bookerEmail,
      verificationCode: ctx.verificationCode,
      isReschedule: ctx.isReschedule,
    });
  }
}
