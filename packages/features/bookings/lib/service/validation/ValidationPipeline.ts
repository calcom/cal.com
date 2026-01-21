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

export interface IValidationPipelineDeps {
  validators: Validator[];
}

export class ValidationPipeline {
  constructor(private deps: IValidationPipelineDeps) {}

  async run(ctx: BookingValidationContext): Promise<void> {
    for (const validator of this.deps.validators) {
      await validator.validate(ctx);
    }
  }
}
