import { ActiveBookingLimitValidator } from "./ActiveBookingLimitValidator";
import { EmailBlocklistValidator } from "./EmailBlocklistValidator";
import { EmailVerificationValidator } from "./EmailVerificationValidator";
import { EventTypeConstraintsValidator } from "./EventTypeConstraintsValidator";
import { RescheduleNoticeValidator } from "./RescheduleNoticeValidator";
import { ValidationPipeline } from "./ValidationPipeline";

export { ActiveBookingLimitValidator } from "./ActiveBookingLimitValidator";
export { EmailBlocklistValidator } from "./EmailBlocklistValidator";
export { EmailVerificationValidator } from "./EmailVerificationValidator";
export { EventTypeConstraintsValidator } from "./EventTypeConstraintsValidator";
export { RescheduleNoticeValidator } from "./RescheduleNoticeValidator";
export type { BookingValidationContext, Validator } from "./ValidationPipeline";
export { ValidationPipeline } from "./ValidationPipeline";

export function createDefaultValidationPipeline(): ValidationPipeline {
  return new ValidationPipeline()
    .add(new EventTypeConstraintsValidator())
    .add(new EmailBlocklistValidator())
    .add(new ActiveBookingLimitValidator())
    .add(new EmailVerificationValidator())
    .add(new RescheduleNoticeValidator());
}
