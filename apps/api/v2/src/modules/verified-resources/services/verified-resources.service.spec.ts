jest.mock("@calcom/platform-libraries", () => ({
  verifyPhoneNumber: jest.fn(),
  sendVerificationCode: jest.fn(),
}));

jest.mock("@calcom/platform-libraries/emails", () => ({
  sendEmailVerificationByCode: jest.fn(),
  verifyEmailCodeHandler: jest.fn(),
}));

import { sendVerificationCode, verifyPhoneNumber } from "@calcom/platform-libraries";
import { sendEmailVerificationByCode, verifyEmailCodeHandler } from "@calcom/platform-libraries/emails";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { UsersVerifiedResourcesRepository } from "@/modules/verified-resources/users-verified-resources.repository";

describe("VerifiedResourcesService", () => {
  let service: VerifiedResourcesService;
  let usersRepo: UsersVerifiedResourcesRepository;
  let teamsRepo: TeamsVerifiedResourcesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifiedResourcesService,
        {
          provide: UsersVerifiedResourcesRepository,
          useValue: {
            getUserVerifiedEmail: jest.fn(),
            getUserVerifiedEmailById: jest.fn(),
            getUserVerifiedEmails: jest.fn(),
            getUserVerifiedPhoneNumber: jest.fn(),
            getUserVerifiedPhoneNumberById: jest.fn(),
            getUserVerifiedPhoneNumbers: jest.fn(),
          },
        },
        {
          provide: TeamsVerifiedResourcesRepository,
          useValue: {
            getTeamVerifiedEmail: jest.fn(),
            getTeamVerifiedEmailById: jest.fn(),
            getTeamVerifiedEmails: jest.fn(),
            getTeamVerifiedPhoneNumber: jest.fn(),
            getTeamVerifiedPhoneNumberById: jest.fn(),
            getTeamVerifiedPhoneNumbers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VerifiedResourcesService>(VerifiedResourcesService);
    usersRepo = module.get<UsersVerifiedResourcesRepository>(UsersVerifiedResourcesRepository);
    teamsRepo = module.get<TeamsVerifiedResourcesRepository>(TeamsVerifiedResourcesRepository);

    jest.clearAllMocks();
  });

  describe("requestEmailVerificationCode", () => {
    it("should return true when email verification is sent successfully", async () => {
      (sendEmailVerificationByCode as jest.Mock).mockResolvedValue({ ok: true, skipped: false });

      const result = await service.requestEmailVerificationCode(
        { username: "testuser", locale: "en" },
        "user@test.com"
      );

      expect(result).toBe(true);
      expect(sendEmailVerificationByCode).toHaveBeenCalledWith({
        email: "user@test.com",
        language: "en",
        username: "testuser",
        isVerifyingEmail: true,
      });
    });

    it("should throw BadRequestException when sending fails", async () => {
      (sendEmailVerificationByCode as jest.Mock).mockResolvedValue({ ok: false, skipped: false });

      await expect(
        service.requestEmailVerificationCode({ username: "testuser", locale: "en" }, "user@test.com")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when email is already verified", async () => {
      (sendEmailVerificationByCode as jest.Mock).mockResolvedValue({ ok: true, skipped: true });

      await expect(
        service.requestEmailVerificationCode({ username: "testuser", locale: "en" }, "user@test.com")
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("requestPhoneVerificationCode", () => {
    it("should return true on success", async () => {
      (sendVerificationCode as jest.Mock).mockResolvedValue(undefined);

      const result = await service.requestPhoneVerificationCode("+1234567890");
      expect(result).toBe(true);
    });

    it("should throw BadRequestException on failure", async () => {
      (sendVerificationCode as jest.Mock).mockRejectedValue(new Error("Twilio error"));

      await expect(service.requestPhoneVerificationCode("+1234567890")).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyPhone", () => {
    it("should verify phone for user and return verified phone number", async () => {
      const mockVerified = { id: 1, phoneNumber: "+1234567890", userId: 1 };
      (verifyPhoneNumber as jest.Mock).mockResolvedValue(true);
      (usersRepo.getUserVerifiedPhoneNumber as jest.Mock).mockResolvedValue(mockVerified);

      const result = await service.verifyPhone(1, "+1234567890", "123456");

      expect(verifyPhoneNumber).toHaveBeenCalledWith("+1234567890", "123456", 1, undefined);
      expect(result).toEqual(mockVerified);
    });

    it("should verify phone for team and return team verified phone number", async () => {
      const mockVerified = { id: 1, phoneNumber: "+1234567890", teamId: 5 };
      (verifyPhoneNumber as jest.Mock).mockResolvedValue(true);
      (teamsRepo.getTeamVerifiedPhoneNumber as jest.Mock).mockResolvedValue(mockVerified);

      const result = await service.verifyPhone(1, "+1234567890", "123456", 5);

      expect(verifyPhoneNumber).toHaveBeenCalledWith("+1234567890", "123456", 1, 5);
      expect(result).toEqual(mockVerified);
    });

    it("should throw BadRequestException when verification fails", async () => {
      (verifyPhoneNumber as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyPhone(1, "+1234567890", "123456")).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email for user and return verified email", async () => {
      const mockVerified = { id: 1, email: "user@test.com", userId: 1 };
      (verifyEmailCodeHandler as jest.Mock).mockResolvedValue(true);
      (usersRepo.getUserVerifiedEmail as jest.Mock).mockResolvedValue(mockVerified);

      const result = await service.verifyEmail(1, "user@test.com", "123456");

      expect(verifyEmailCodeHandler).toHaveBeenCalledWith({
        ctx: { user: { id: 1 } },
        input: { email: "user@test.com", code: "123456", teamId: undefined },
      });
      expect(result).toEqual(mockVerified);
    });

    it("should verify email for team and return team verified email", async () => {
      const mockVerified = { id: 1, email: "user@test.com", teamId: 5 };
      (verifyEmailCodeHandler as jest.Mock).mockResolvedValue(true);
      (teamsRepo.getTeamVerifiedEmail as jest.Mock).mockResolvedValue(mockVerified);

      const result = await service.verifyEmail(1, "user@test.com", "123456", 5);
      expect(result).toEqual(mockVerified);
    });

    it("should throw BadRequestException for invalid verification code", async () => {
      (verifyEmailCodeHandler as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyEmail(1, "user@test.com", "wrong")).rejects.toThrow(BadRequestException);
    });
  });

  describe("delegation methods", () => {
    it("getUserVerifiedEmailById delegates to user repo", async () => {
      await service.getUserVerifiedEmailById(1, 10);
      expect(usersRepo.getUserVerifiedEmailById).toHaveBeenCalledWith(1, 10);
    });

    it("getTeamVerifiedEmailById delegates to team repo", async () => {
      await service.getTeamVerifiedEmailById(5, 10);
      expect(teamsRepo.getTeamVerifiedEmailById).toHaveBeenCalledWith(10, 5);
    });

    it("getUserVerifiedEmails delegates with pagination", async () => {
      await service.getUserVerifiedEmails(1, 5, 10);
      expect(usersRepo.getUserVerifiedEmails).toHaveBeenCalledWith(1, 5, 10);
    });

    it("getTeamVerifiedEmails delegates with pagination", async () => {
      await service.getTeamVerifiedEmails(5, 0, 100);
      expect(teamsRepo.getTeamVerifiedEmails).toHaveBeenCalledWith(5, 0, 100);
    });

    it("getUserVerifiedPhoneNumbers delegates with pagination", async () => {
      await service.getUserVerifiedPhoneNumbers(1, 0, 50);
      expect(usersRepo.getUserVerifiedPhoneNumbers).toHaveBeenCalledWith(1, 0, 50);
    });

    it("getTeamVerifiedPhoneNumbers delegates with pagination", async () => {
      await service.getTeamVerifiedPhoneNumbers(5, 0, 50);
      expect(teamsRepo.getTeamVerifiedPhoneNumbers).toHaveBeenCalledWith(5, 0, 50);
    });
  });
});
