import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { CheckEmailVerificationRequiredParams } from "@/modules/atoms/inputs/check-email-verification-required-params";
import { GetVerifiedEmailsInput } from "@/modules/atoms/inputs/get-verified-emails-params";
import { SendVerificationEmailInput } from "@/modules/atoms/inputs/send-verification-email.input";
import { VerifyEmailCodeInput } from "@/modules/atoms/inputs/verify-email-code.input";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";

import {
  verifyCodeUnAuthenticated,
  verifyCodeAuthenticated,
  sendEmailVerificationByCode,
  checkEmailVerificationRequired,
} from "@calcom/platform-libraries";

@Injectable()
export class VerificationAtomsService {
  constructor(private readonly atomsRepository: AtomsRepository) {}

  async checkEmailVerificationRequired(input: CheckEmailVerificationRequiredParams) {
    return await checkEmailVerificationRequired(input);
  }

  async verifyEmailCodeUnAuthenticated(input: VerifyEmailCodeInput) {
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

  async verifyEmailCodeAuthenticated(user: UserWithProfile, input: VerifyEmailCodeInput) {
    try {
      return await verifyCodeAuthenticated({
        user,
        email: input.email,
        code: input.code,
      });
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

  async sendEmailVerificationCode(input: SendVerificationEmailInput) {
    return await sendEmailVerificationByCode({
      email: input.email,
      username: input.username,
      language: input.language,
      isVerifyingEmail: input.isVerifyingEmail,
    });
  }

  async getVerifiedEmails(input: GetVerifiedEmailsInput): Promise<string[]> {
    const { userId, userEmail, teamId } = input;
    if (teamId) {
      // implement team logic here
      // and then return here only
      return [];
    }

    let verifiedEmails = [userEmail];

    const secondaryEmails = await this.atomsRepository.getSecondaryEmails(userId);
    verifiedEmails = verifiedEmails.concat(secondaryEmails.map((secondaryEmail) => secondaryEmail.email));

    return verifiedEmails;
  }
}
