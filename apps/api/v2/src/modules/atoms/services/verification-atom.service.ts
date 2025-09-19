import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { CheckEmailVerificationRequiredParams } from "@/modules/atoms/inputs/check-email-verification-required-params";
import { GetVerifiedEmailsInput } from "@/modules/atoms/inputs/get-verified-emails-params";
import { SendVerificationEmailInput } from "@/modules/atoms/inputs/send-verification-email.input";
import { VerifyEmailCodeInput } from "@/modules/atoms/inputs/verify-email-code.input";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
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
  constructor(
    private readonly atomsRepository: AtomsRepository,
    private readonly teamsRepository: TeamsRepository
  ) {}

  async checkEmailVerificationRequired(input: CheckEmailVerificationRequiredParams) {
    return await checkEmailVerificationRequired(input);
  }

  async verifyEmailCodeUnAuthenticated(input: VerifyEmailCodeInput) {
    try {
      return await verifyCodeUnAuthenticated(input.email, input.code);
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
    const userEmailWithoutOauthClientId = this.removeClientIdFromEmail(userEmail);

    if (teamId) {
      const verifiedEmails: string[] = [];
      const teamMembers = await this.teamsRepository.getTeamMemberEmails(teamId);

      if (teamMembers.length === 0) {
        return verifiedEmails;
      }

      teamMembers.forEach((member) => {
        const memberEmailWithoutOauthClientId = this.removeClientIdFromEmail(member.email);

        verifiedEmails.push(memberEmailWithoutOauthClientId);
        member.secondaryEmails.forEach((secondaryEmail) => {
          verifiedEmails.push(this.removeClientIdFromEmail(secondaryEmail.email));
        });
      });

      return verifiedEmails;
    }

    let verifiedEmails = [userEmailWithoutOauthClientId];

    const secondaryEmails = await this.atomsRepository.getSecondaryEmails(userId);
    verifiedEmails = verifiedEmails.concat(
      secondaryEmails.map((secondaryEmail) => this.removeClientIdFromEmail(secondaryEmail.email))
    );

    return verifiedEmails;
  }

  async addVerifiedEmail({
    userId,
    existingPrimaryEmail,
    email,
  }: {
    userId: number;
    existingPrimaryEmail: string;
    email: string;
  }): Promise<boolean> {
    const existingSecondaryEmail = await this.atomsRepository.getExistingSecondaryEmailByUserAndEmail(
      userId,
      email
    );
    const alreadyExistingEmail = await this.atomsRepository.getExistingSecondaryEmail(email);

    if (alreadyExistingEmail) {
      throw new BadRequestException("Email already exists");
    }

    if (existingPrimaryEmail === email || existingSecondaryEmail === email) {
      return true;
    }

    await this.atomsRepository.addSecondaryEmail(userId, email);

    return true;
  }

  removeClientIdFromEmail(email: string): string {
    const [localPart, domain] = email.split("@");
    const localPartSegments = localPart.split("+");

    localPartSegments.pop();

    const baseEmail = localPartSegments.join("+");
    const normalizedEmail = `${baseEmail}@${domain}`;

    return normalizedEmail;
  }
}
