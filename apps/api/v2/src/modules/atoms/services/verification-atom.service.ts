import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";

import {
  verifyCodeUnAuthenticated,
  verifyCodeAuthenticated,
  sendVerifyEmailCode,
} from "@calcom/platform-libraries";
import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import type { TSendVerifyEmailCodeSchema } from "@calcom/trpc/server/routers/viewer/auth/sendVerifyEmailCode.schema";
import type { VerifyCodeAuthenticatedInput } from "@calcom/trpc/server/routers/viewer/organizations/verifyCode.handler";

@Injectable()
export class VerificationAtomsService {
  async verifyEmailCodeUnAuthenticated(input: ZVerifyCodeInputSchema) {
    try {
      return await verifyCodeUnAuthenticated(input);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_code") {
          throw new BadRequestException("Invalid verification code");
        }
        if (error.message === "BAD_REQUEST") {
          throw new BadRequestException("Email and code are required");
        }
      }
      throw new BadRequestException("Verification failed");
    }
  }

  async verifyEmailCodeAuthenticated(input: VerifyCodeAuthenticatedInput) {
    try {
      return await verifyCodeAuthenticated(input);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_code") {
          throw new BadRequestException("Invalid verification code");
        }
        if (error.message === "BAD_REQUEST") {
          throw new BadRequestException("Email, code, and user ID are required");
        }
      }
      throw new UnauthorizedException("Verification failed");
    }
  }

  async sendEmailVerificationCode(input: TSendVerifyEmailCodeSchema) {
    try {
      return await sendVerifyEmailCode(input);
    } catch (error) {
      if (error instanceof Error && error.message.includes("rate")) {
        throw new BadRequestException("Rate limit exceeded. Please try again later.");
      }
      throw new BadRequestException("Failed to send verification code");
    }
  }
}
