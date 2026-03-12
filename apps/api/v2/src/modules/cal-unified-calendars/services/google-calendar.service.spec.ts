jest.mock(
  "@calcom/platform-libraries/app-store",
  () => ({
    DelegationCredentialRepository: {
      findByIdIncludeSensitiveServiceAccountKey: jest.fn().mockResolvedValue(null),
    },
    OAuth2UniversalSchema: { parse: jest.fn((v: unknown) => v) },
  }),
  { virtual: true }
);
jest.mock(
  "@calcom/platform-libraries",
  () => ({
    getBusyCalendarTimes: jest.fn(),
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb: jest.fn(),
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);

import { GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GoogleCalendarService } from "./google-calendar.service";
import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/booking-references.repository";
import { GoogleCalendarService as GCalService } from "@/ee/calendars/services/gcal.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";

describe("GoogleCalendarService", () => {
  let service: GoogleCalendarService;
  let mockBookingReferencesRepo: { getBookingReferencesIncludeSensitiveCredentials: jest.Mock };
  let mockGCalService: { getOAuthClient: jest.Mock; redirectUri: string };
  let mockCredentialsRepo: {
    findCredentialWithDelegationByTypeAndUserId: jest.Mock;
    findCredentialByIdAndUserId: jest.Mock;
  };

  const userId = 42;
  const credentialId = 100;

  beforeEach(async () => {
    mockBookingReferencesRepo = {
      getBookingReferencesIncludeSensitiveCredentials: jest.fn(),
    };

    mockGCalService = {
      getOAuthClient: jest.fn().mockResolvedValue({
        setCredentials: jest.fn(),
      }),
      redirectUri: "http://localhost/callback",
    };

    mockCredentialsRepo = {
      findCredentialWithDelegationByTypeAndUserId: jest.fn(),
      findCredentialByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: BookingReferencesRepository_2024_08_13,
          useValue: mockBookingReferencesRepo,
        },
        {
          provide: GCalService,
          useValue: mockGCalService,
        },
        {
          provide: CredentialsRepository,
          useValue: mockCredentialsRepo,
        },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
  });

  describe("getCalendarClientForUser", () => {
    it("should throw UnauthorizedException when no credential found", async () => {
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue(null);

      await expect(service.getCalendarClientForUser(userId)).rejects.toThrow(UnauthorizedException);
      expect(mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId).toHaveBeenCalledWith(
        GOOGLE_CALENDAR_TYPE,
        userId
      );
    });

    it("should throw UnauthorizedException when credential is invalid", async () => {
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token" },
        invalid: true,
        delegationCredentialId: null,
        user: { email: "user@example.com" },
      });

      await expect(service.getCalendarClientForUser(userId)).rejects.toThrow(
        "Google Calendar credentials are invalid. Please reconnect."
      );
    });

    it("should return a calendar instance for valid OAuth credential without delegation", async () => {
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: null,
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).toHaveBeenCalledWith("http://localhost/callback");
    });

    it("should pass delegation credential info when delegationCredentialId is present", async () => {
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: "deleg-cred-123",
        user: { email: "user@example.com" },
      });

      // Delegation will fail (no real service account), so it falls back to OAuth
      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
    });

    it("should handle missing user email gracefully", async () => {
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: null,
        user: null,
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
    });
  });

  describe("getCalendarClientByCredentialId", () => {
    it("should throw NotFoundException when credential not found", async () => {
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue(null);

      await expect(service.getCalendarClientByCredentialId(userId, credentialId)).rejects.toThrow(
        NotFoundException
      );
      expect(mockCredentialsRepo.findCredentialByIdAndUserId).toHaveBeenCalledWith(credentialId, userId);
    });

    it("should throw BadRequestException when credential type is not Google Calendar", async () => {
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue({
        id: credentialId,
        type: "office365_calendar",
        key: { access_token: "token" },
        invalid: false,
        delegationCredentialId: null,
        user: { email: "user@example.com" },
      });

      await expect(service.getCalendarClientByCredentialId(userId, credentialId)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw UnauthorizedException when credential is invalid", async () => {
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token" },
        invalid: true,
        delegationCredentialId: null,
        user: { email: "user@example.com" },
      });

      await expect(service.getCalendarClientByCredentialId(userId, credentialId)).rejects.toThrow(
        "Calendar credentials are invalid. Please reconnect."
      );
    });

    it("should return a calendar instance for valid Google credential", async () => {
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: null,
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientByCredentialId(userId, credentialId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).toHaveBeenCalled();
    });

    it("should pass delegation info when delegationCredentialId is present", async () => {
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: "deleg-cred-456",
        user: { email: "user@example.com" },
      });

      // Delegation will fail (no real service account), falls back to OAuth
      const calendar = await service.getCalendarClientByCredentialId(userId, credentialId);

      expect(calendar).toBeDefined();
    });
  });

  describe("getEventDetails", () => {
    it("should throw NotFoundException when booking reference not found", async () => {
      mockBookingReferencesRepo.getBookingReferencesIncludeSensitiveCredentials.mockResolvedValue(null);

      await expect(service.getEventDetails("non-existent-uid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateEventDetails", () => {
    it("should throw NotFoundException when booking reference not found", async () => {
      mockBookingReferencesRepo.getBookingReferencesIncludeSensitiveCredentials.mockResolvedValue(null);

      await expect(service.updateEventDetails("non-existent-uid", { title: "test" })).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
