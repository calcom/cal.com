import { VerifiedResourcesRepository } from "@/modules/verified-resources/verified-resources.repository";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import {
  verifyPhoneNumber,
  sendVerificationCode as sendPhoneVerificationCode,
} from "@calcom/platform-libraries";
import { sendEmailVerificationByCode, verifyEmailCodeHandler } from "@calcom/platform-libraries/emails";

@Injectable()
export class VerifiedResourcesService {
  constructor(private readonly verifiedResourcesRepository: VerifiedResourcesRepository) {}

  async requestEmailVerificationCode(user: { username: string; locale: string }, email: string) {
    const res = await sendEmailVerificationByCode({
      email: email,
      language: user.locale,
      username: user.username,
      isVerifyingEmail: true,
    });

    if (res.ok && !res.skipped) {
      return true;
    }

    if (!res.ok) {
      throw new BadRequestException("Email could not be verified.");
    }

    if (res.skipped) {
      throw new ConflictException("Email is already verified.");
    }

    return true;
  }

  async requestPhoneVerificationCode(phone: string) {
    try {
      await sendPhoneVerificationCode(phone);
    } catch (err) {
      throw new BadRequestException("Could not send verification code to this phone number.");
    }

    return true;
  }

  async verifyPhone(userId: number, phone: string, code: string, teamId?: number) {
    const result = await verifyPhoneNumber(phone, code, userId, teamId);

    if (result) {
      return await this.verifiedResourcesRepository.getVerifiedPhoneNumber(userId, phone, teamId);
    }

    throw new BadRequestException("Could not verify phone number.");
  }

  async verifyEmail(userId: number, email: string, code: string, teamId?: number) {
    const isValidToken = await verifyEmailCodeHandler({
      ctx: { user: { id: userId } },
      input: { email, code, teamId },
    });
    if (isValidToken) {
      const verifiedEmail = await this.verifiedResourcesRepository.getVerifiedEmail(userId, email, teamId);
      return verifiedEmail;
    }
    throw new BadRequestException("Invalid Verification Code");
  }

  async getUserVerifiedEmailById(userId: number, id: number) {
    return this.verifiedResourcesRepository.getUserVerifiedEmailById(userId, id);
  }

  async getTeamVerifiedEmailById(teamId: number, id: number) {
    return this.verifiedResourcesRepository.getTeamVerifiedEmailById(id, teamId);
  }

  async getVerifiedEmail(userId: number, email: string, teamId?: number) {
    return this.verifiedResourcesRepository.getVerifiedEmail(userId, email, teamId);
  }

  async getUserVerifiedEmails(userId: number, skip = 0, take = 250) {
    return this.verifiedResourcesRepository.getUserVerifiedEmails(userId, skip, take);
  }

  async getTeamVerifiedEmails(teamId: number, skip = 0, take = 250) {
    return this.verifiedResourcesRepository.getTeamVerifiedEmails(teamId, skip, take);
  }

  async getUserVerifiedPhoneNumberById(userId: number, id: number) {
    return this.verifiedResourcesRepository.getUserVerifiedPhoneNumberById(userId, id);
  }

  async getTeamVerifiedPhoneNumberById(teamId: number, id: number) {
    return this.verifiedResourcesRepository.getTeamVerifiedPhoneNumberById(teamId, id);
  }

  async getVerifiedPhoneNumber(userId: number, phoneNumber: string, teamId?: number) {
    return this.verifiedResourcesRepository.getVerifiedPhoneNumber(userId, phoneNumber, teamId);
  }

  async getUserVerifiedPhoneNumbers(userId: number, skip = 0, take = 250) {
    return this.verifiedResourcesRepository.getUserVerifiedPhoneNumbers(userId, skip, take);
  }

  async getTeamVerifiedPhoneNumbers(teamId: number, skip = 0, take = 250) {
    return this.verifiedResourcesRepository.getTeamVerifiedPhoneNumbers(teamId, skip, take);
  }
}
