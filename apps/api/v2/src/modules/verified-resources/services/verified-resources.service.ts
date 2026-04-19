import {
  sendVerificationCode as sendPhoneVerificationCode,
  verifyPhoneNumber,
} from "@calcom/platform-libraries";
import { sendEmailVerificationByCode, verifyEmailCodeHandler } from "@calcom/platform-libraries/emails";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { UsersVerifiedResourcesRepository } from "@/modules/verified-resources/users-verified-resources.repository";

@Injectable()
export class VerifiedResourcesService {
  constructor(
    private readonly usersVerifiedResourcesRepository: UsersVerifiedResourcesRepository,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository
  ) {}

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
      return teamId
        ? await this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumber(userId, phone, teamId)
        : await this.usersVerifiedResourcesRepository.getUserVerifiedPhoneNumber(userId, phone);
    }

    throw new BadRequestException("Could not verify phone number.");
  }

  async verifyEmail(userId: number, email: string, code: string, teamId?: number) {
    const isValidToken = await verifyEmailCodeHandler({
      ctx: { user: { id: userId } },
      input: { email, code, teamId },
    });
    if (isValidToken) {
      const verifiedEmail = teamId
        ? await this.teamsVerifiedResourcesRepository.getTeamVerifiedEmail(userId, email, teamId)
        : await this.usersVerifiedResourcesRepository.getUserVerifiedEmail(userId, email);
      return verifiedEmail;
    }
    throw new BadRequestException("Invalid Verification Code");
  }

  async getUserVerifiedEmailById(userId: number, id: number) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedEmailById(userId, id);
  }

  async getTeamVerifiedEmailById(teamId: number, id: number) {
    return this.teamsVerifiedResourcesRepository.getTeamVerifiedEmailById(id, teamId);
  }

  async getVerifiedEmail(userId: number, email: string) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedEmail(userId, email);
  }

  async getUserVerifiedEmails(userId: number, skip = 0, take = 250) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedEmails(userId, skip, take);
  }

  async getTeamVerifiedEmails(teamId: number, skip = 0, take = 250) {
    return this.teamsVerifiedResourcesRepository.getTeamVerifiedEmails(teamId, skip, take);
  }

  async getUserVerifiedPhoneNumberById(userId: number, id: number) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedPhoneNumberById(userId, id);
  }

  async getTeamVerifiedPhoneNumberById(teamId: number, id: number) {
    return this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumberById(id, teamId);
  }

  async getUserVerifiedPhoneNumber(userId: number, phoneNumber: string) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedEmail(userId, phoneNumber);
  }

  async getTeamVerifiedPhoneNumber(userId: number, phoneNumber: string, teamId: number) {
    return this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumber(userId, phoneNumber, teamId);
  }

  async getUserVerifiedPhoneNumbers(userId: number, skip = 0, take = 250) {
    return this.usersVerifiedResourcesRepository.getUserVerifiedPhoneNumbers(userId, skip, take);
  }

  async getTeamVerifiedPhoneNumbers(teamId: number, skip = 0, take = 250) {
    return this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumbers(teamId, skip, take);
  }
}
