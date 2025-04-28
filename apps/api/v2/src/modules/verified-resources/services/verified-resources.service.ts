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
      throw new BadRequestException("Email could not be verfied.");
    }

    if (res.skipped) {
      throw new ConflictException("Email is already verfied.");
    }

    return true;
  }

  async requestPhoneVerificationCode(phone: string) {
    await sendPhoneVerificationCode(phone);
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
    return this.verifiedResourcesRepository.getTeamVerifiedEmailById(teamId, id);
  }

  async getVerifiedEmail(userId: number, email: string, teamId?: number) {
    return this.verifiedResourcesRepository.getVerifiedEmail(userId, email, teamId);
  }

  async getUserVerifiedEmails(userId: number) {
    return this.verifiedResourcesRepository.getUserVerifiedEmails(userId);
  }

  async getTeamVerifiedEmails(teamId: number) {
    return this.verifiedResourcesRepository.getTeamVerifiedEmails(teamId);
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

  async getUserVerifiedPhoneNumbers(userId: number) {
    return this.verifiedResourcesRepository.getUserVerifiedPhoneNumbers(userId);
  }

  async getTeamVerifiedPhoneNumbers(teamId: number) {
    return this.verifiedResourcesRepository.getTeamVerifiedPhoneNumbers(teamId);
  }
}
