jest.mock("@/modules/oauth-clients/services/oauth-clients-users.service", () => ({
  OAuthClientUsersService: { getOAuthUserEmail: jest.fn() },
}));

import type { PlatformOAuthClient } from "@calcom/prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformBookingsService } from "./platform-bookings.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UsersRepository } from "@/modules/users/users.repository";

describe("PlatformBookingsService", () => {
  let service: PlatformBookingsService;
  let oAuthClientRepository: OAuthClientRepository;
  let eventTypesRepository: EventTypesRepository_2024_06_14;

  const mockOAuthClient: PlatformOAuthClient = {
    id: "oauth-client-123",
    name: "Test OAuth Client",
    secret: "secret",
    permissions: 0,
    logo: null,
    redirectUris: [],
    organizationId: 1,
    createdAt: new Date(),
    bookingRedirectUri: "https://example.com/booking",
    bookingCancelRedirectUri: "https://example.com/cancel",
    bookingRescheduleRedirectUri: "https://example.com/reschedule",
    areEmailsEnabled: true,
    areCalendarEventsEnabled: true,
    areDefaultEventTypesEnabled: true,
  };

  const expectedParams = {
    platformClientId: "oauth-client-123",
    platformCancelUrl: "https://example.com/cancel",
    platformRescheduleUrl: "https://example.com/reschedule",
    platformBookingUrl: "https://example.com/booking",
    arePlatformEmailsEnabled: true,
    areCalendarEventsEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformBookingsService,
        {
          provide: UsersRepository,
          useValue: { findByEmail: jest.fn() },
        },
        {
          provide: EventTypesRepository_2024_06_14,
          useValue: { getEventTypeById: jest.fn() },
        },
        {
          provide: OAuthClientRepository,
          useValue: {
            getByUserId: jest.fn(),
            getByTeamId: jest.fn(),
            getByEventTypeHosts: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlatformBookingsService>(PlatformBookingsService);
    oAuthClientRepository = module.get<OAuthClientRepository>(OAuthClientRepository);
    eventTypesRepository = module.get<EventTypesRepository_2024_06_14>(EventTypesRepository_2024_06_14);

    jest.clearAllMocks();
  });

  describe("getOAuthClientParamsByUserId", () => {
    it("should return OAuth client params when user has an associated OAuth client", async () => {
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParamsByUserId(42);

      expect(oAuthClientRepository.getByUserId).toHaveBeenCalledWith(42);
      expect(result).toEqual(expectedParams);
    });

    it("should return undefined when user has no associated OAuth client", async () => {
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(null);

      const result = await service.getOAuthClientParamsByUserId(42);

      expect(oAuthClientRepository.getByUserId).toHaveBeenCalledWith(42);
      expect(result).toBeUndefined();
    });
  });

  describe("getOAuthClientParams", () => {
    it("should return undefined when event type does not exist (deleted)", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue(null);

      const result = await service.getOAuthClientParams(999);

      expect(eventTypesRepository.getEventTypeById).toHaveBeenCalledWith(999);
      expect(oAuthClientRepository.getByUserId).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("should resolve OAuth client from event type userId", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue({
        id: 10,
        userId: 42,
        teamId: null,
      });
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParams(10);

      expect(oAuthClientRepository.getByUserId).toHaveBeenCalledWith(42);
      expect(result).toEqual(expectedParams);
    });

    it("should resolve OAuth client from event type teamId when userId is null", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue({
        id: 10,
        userId: null,
        teamId: 5,
      });
      (oAuthClientRepository.getByTeamId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParams(10);

      expect(oAuthClientRepository.getByTeamId).toHaveBeenCalledWith(5);
      expect(result).toEqual(expectedParams);
    });
  });

  describe("getOAuthClientParamsForBookingCancelled", () => {
    it("should resolve from eventTypeId when available", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue({
        id: 10,
        userId: 42,
        teamId: null,
      });
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParamsForBookingCancelled(10, 42);

      expect(eventTypesRepository.getEventTypeById).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedParams);
    });

    it("should fall back to userId when eventTypeId is null", async () => {
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParamsForBookingCancelled(null, 42);

      expect(eventTypesRepository.getEventTypeById).not.toHaveBeenCalled();
      expect(oAuthClientRepository.getByUserId).toHaveBeenCalledWith(42);
      expect(result).toEqual(expectedParams);
    });

    it("should fall back to userId when event type lookup returns undefined (deleted event type)", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue(null);
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(mockOAuthClient);

      const result = await service.getOAuthClientParamsForBookingCancelled(99, 42);

      expect(eventTypesRepository.getEventTypeById).toHaveBeenCalledWith(99);
      expect(oAuthClientRepository.getByUserId).toHaveBeenCalledWith(42);
      expect(result).toEqual(expectedParams);
    });

    it("should return undefined when neither lookup resolves an OAuth client", async () => {
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue(null);
      (oAuthClientRepository.getByUserId as jest.Mock).mockResolvedValue(null);

      const result = await service.getOAuthClientParamsForBookingCancelled(99, 42);

      expect(result).toBeUndefined();
    });

    it("should return undefined when both eventTypeId and userId are null", async () => {
      const result = await service.getOAuthClientParamsForBookingCancelled(null, null);

      expect(eventTypesRepository.getEventTypeById).not.toHaveBeenCalled();
      expect(oAuthClientRepository.getByUserId).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
