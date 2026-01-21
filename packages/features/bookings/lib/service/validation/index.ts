import { ActiveBookingLimitValidator } from "./ActiveBookingLimitValidator";
import { EmailBlocklistValidator } from "./EmailBlocklistValidator";
import { EmailVerificationValidator } from "./EmailVerificationValidator";
import { EventTypeConstraintsValidator } from "./EventTypeConstraintsValidator";
import { RescheduleNoticeValidator } from "./RescheduleNoticeValidator";
import type { Validator } from "./ValidationPipeline";
import { ValidationPipeline } from "./ValidationPipeline";

export { ActiveBookingLimitValidator } from "./ActiveBookingLimitValidator";
export { EmailBlocklistValidator } from "./EmailBlocklistValidator";
export { EmailVerificationValidator } from "./EmailVerificationValidator";
export { EventTypeConstraintsValidator } from "./EventTypeConstraintsValidator";
export { RescheduleNoticeValidator } from "./RescheduleNoticeValidator";
export type { BookingValidationContext, IValidationPipelineDeps, Validator } from "./ValidationPipeline";
export { ValidationPipeline } from "./ValidationPipeline";

export function createDefaultValidators(): Validator[] {
  return [
    new EventTypeConstraintsValidator(),
    new EmailBlocklistValidator(),
    new ActiveBookingLimitValidator(),
    new EmailVerificationValidator(),
    new RescheduleNoticeValidator(),
  ];
}

export function createDefaultValidationPipeline(): ValidationPipeline {
  return new ValidationPipeline({ validators: createDefaultValidators() });
}
