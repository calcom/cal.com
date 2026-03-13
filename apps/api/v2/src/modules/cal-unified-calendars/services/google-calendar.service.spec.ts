/**
 * Virtual mocks are required here because:
 * - @calcom/platform-libraries/app-store and @calcom/platform-libraries are workspace packages
 *   whose transitive dependencies (prisma, DB connections) cannot be resolved in the Jest
 *   unit-test environment. We mock them to isolate GoogleCalendarService logic.
 * - googleapis-common and @googleapis/calendar are mocked to verify JWT creation params
 *   and Calendar construction without hitting real Google APIs.
 */
const mockDelegationFindById = jest.fn().mockResolvedValue(null);
const mockJwtAuthorize = jest.fn().mockResolvedValue(undefined);
const MockJWT = jest.fn().mockImplementation(() => ({
  authorize: mockJwtAuthorize,
}));
const MockCalendar = jest.fn().mockImplementation(() => ({ events: {} }));
jest.mock(
  "@calcom/platform-libraries/app-store",
  () => ({
    DelegationCredentialRepository: {
      findByIdIncludeSensitiveServiceAccountKey: mockDelegationFindById,
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
jest.mock("googleapis-common", () => ({
  JWT: MockJWT,
}));
jest.mock("@googleapis/calendar", () => ({
  calendar_v3: {
    Calendar: MockCalendar,
  },
}));

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

    it("should use delegation path when service account key is available (getOAuthClient not called)", async () => {
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nMOCK_KEY_FOR_TEST\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: null,
        invalid: false,
        delegationCredentialId: "deleg-cred-123",
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).not.toHaveBeenCalled();
    });

    it("should create JWT with correct params for delegation (email, key, scopes, subject)", async () => {
      MockJWT.mockClear();
      mockJwtAuthorize.mockClear();
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: null,
        invalid: false,
        delegationCredentialId: "deleg-cred-200",
        user: { email: "delegated-user@example.com" },
      });

      await service.getCalendarClientForUser(userId);

      expect(MockJWT).toHaveBeenCalledWith({
        email: "sa@project.iam.gserviceaccount.com",
        key: "-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n",
        scopes: ["https://www.googleapis.com/auth/calendar"],
        subject: "delegated-user@example.com",
      });
      expect(mockJwtAuthorize).toHaveBeenCalled();
    });

    it("should strip OAuth client ID alias from email before delegation", async () => {
      MockJWT.mockClear();
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: null,
        invalid: false,
        delegationCredentialId: "deleg-cred-300",
        user: { email: "user+abcdefghijklmnopqrstuvwxy@example.com" },
      });

      await service.getCalendarClientForUser(userId);

      expect(MockJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "user@example.com",
        })
      );
    });

    it("should fall back to OAuth when delegation service account key has missing client_email", async () => {
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: null,
          private_key: "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: "deleg-cred-400",
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).toHaveBeenCalled();
    });

    it("should fall back to OAuth when delegation service account key has missing private_key", async () => {
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: null,
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: "deleg-cred-500",
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).toHaveBeenCalled();
    });

    it("should fall back to OAuth when JWT authorize() throws", async () => {
      mockJwtAuthorize.mockRejectedValueOnce(new Error("authorize failed"));
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: { access_token: "token", refresh_token: "refresh", token_type: "Bearer" },
        invalid: false,
        delegationCredentialId: "deleg-cred-600",
        user: { email: "user@example.com" },
      });

      const calendar = await service.getCalendarClientForUser(userId);

      expect(calendar).toBeDefined();
      expect(mockGCalService.getOAuthClient).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when delegation fails and no OAuth key available", async () => {
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: null,
          private_key: null,
        },
      });
      mockCredentialsRepo.findCredentialWithDelegationByTypeAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: null,
        invalid: false,
        delegationCredentialId: "deleg-cred-700",
        user: { email: "user@example.com" },
      });

      await expect(service.getCalendarClientForUser(userId)).rejects.toThrow(
        "No valid credentials available for Google Calendar"
      );
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

    it("should use delegation path with JWT for getCalendarClientByCredentialId", async () => {
      MockJWT.mockClear();
      mockJwtAuthorize.mockClear();
      mockDelegationFindById.mockResolvedValueOnce({
        serviceAccountKey: {
          client_email: "sa@project.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nKEY_FOR_CRED\n-----END PRIVATE KEY-----\n",
        },
      });
      mockCredentialsRepo.findCredentialByIdAndUserId.mockResolvedValue({
        id: credentialId,
        type: GOOGLE_CALENDAR_TYPE,
        key: null,
        invalid: false,
        delegationCredentialId: "deleg-by-cred-id",
        user: { email: "cred-user@example.com" },
      });

      const calendar = await service.getCalendarClientByCredentialId(userId, credentialId);

      expect(calendar).toBeDefined();
      expect(MockJWT).toHaveBeenCalledWith({
        email: "sa@project.iam.gserviceaccount.com",
        key: "-----BEGIN PRIVATE KEY-----\nKEY_FOR_CRED\n-----END PRIVATE KEY-----\n",
        scopes: ["https://www.googleapis.com/auth/calendar"],
        subject: "cred-user@example.com",
      });
      expect(mockJwtAuthorize).toHaveBeenCalled();
      expect(mockGCalService.getOAuthClient).not.toHaveBeenCalled();
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
