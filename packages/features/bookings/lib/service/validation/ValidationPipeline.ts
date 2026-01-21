import type { getEventTypeResponse } from "../../handleNewBooking/getEventTypesFromDB";

export interface BookingValidationContext {
  bookerEmail: string;
  userId: number | null;
  eventType: NonNullable<getEventTypeResponse>;
  isReschedule: boolean;
  verificationCode?: string;
  rescheduleUid?: string | null;
}

export interface Validator {
  validate(ctx: BookingValidationContext): Promise<void>;
}

export class ValidationPipeline {
  private validators: Validator[] = [];

  add(validator: Validator): this {
    this.validators.push(validator);
    return this;
  }

  async run(ctx: BookingValidationContext): Promise<void> {
    for (const validator of this.validators) {
      await validator.validate(ctx);
    }
  }
}
