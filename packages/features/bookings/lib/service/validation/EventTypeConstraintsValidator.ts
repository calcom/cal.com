import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { BookingValidationContext, Validator } from "./ValidationPipeline";

export class EventTypeConstraintsValidator implements Validator {
  async validate(ctx: BookingValidationContext): Promise<void> {
    if (!ctx.eventType) {
      throw new ErrorWithCode(ErrorCode.EventTypeNotFound, "event_type_not_found");
    }

    if (ctx.eventType.seatsPerTimeSlot && ctx.eventType.recurringEvent) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "recurring_event_seats_error");
    }
  }
}
