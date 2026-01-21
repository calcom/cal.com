import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { BookingValidationContext, Validator } from "./ValidationPipeline";

export class EmailVerificationValidator implements Validator {
  async validate(ctx: BookingValidationContext): Promise<void> {
    if (!ctx.eventType.requiresBookerEmailVerification || ctx.isReschedule) {
      return;
    }

    if (!ctx.verificationCode) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "email_verification_required");
    }

    try {
      await verifyCodeUnAuthenticated(ctx.bookerEmail, ctx.verificationCode);
    } catch {
      throw new ErrorWithCode(ErrorCode.InvalidVerificationCode, "invalid_verification_code");
    }
  }
}
