// Mock modules with deep transitive dependency chains to avoid @calcom/platform-libraries resolution issues
jest.mock("@/modules/oauth-clients/services/oauth-clients-users.service", () => ({
  OAuthClientUsersService: { getOAuthUserEmail: jest.fn() },
}));

jest.mock("@/ee/event-types/event-types_2024_06_14/services/output-event-types.service", () => ({
  OutputEventTypesService_2024_06_14: jest.fn(),
}));

jest.mock("@/ee/bookings/shared/platform-bookings.service", () => ({
  PlatformBookingsService: jest.fn(),
}));

jest.mock("@/ee/bookings/2024-08-13/services/bookings.service", () => ({
  BookingsService_2024_08_13: jest.fn(),
  eventTypeBookingFieldsSchema: { parse: jest.fn() },
}));

jest.mock("@/ee/bookings/2024-08-13/services/output.service", () => ({
  bookingResponsesSchema: { parse: jest.fn() },
  seatedBookingDataSchema: { parse: jest.fn() },
}));

jest.mock("@/lib/api-key", () => ({
  sha256Hash: jest.fn((val: string) => `hashed_${val}`),
  isApiKey: jest.fn(),
  stripApiKey: jest.fn((key: string) => key.replace("cal_test_", "")),
}));

import { isApiKey } from "@/lib/api-key";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { InputBookingsService_2024_08_13 } from "./input.service";

describe("InputBookingsService_2024_08_13", () => {
  let service: InputBookingsService_2024_08_13;
  let apiKeysRepository: ApiKeysRepository;
  let oAuthFlowService: OAuthFlowService;
  let usersRepository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputBookingsService_2024_08_13,
        {
          provide: OAuthFlowService,
          useValue: {
            getOwnerId: jest.fn(),
          },
        },
        {
          provide: EventTypesRepository_2024_06_14,
          useValue: {},
        },
        {
          provide: BookingsRepository_2024_08_13,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "api.apiKeyPrefix") return "cal_test_";
              if (key === "api.keyPrefix") return "cal_test_";
              return null;
            }),
          },
        },
        {
          provide: ApiKeysRepository,
          useValue: {
            getApiKeyFromHash: jest.fn(),
          },
        },
        {
          provide: BookingSeatRepository,
          useValue: {},
        },
        {
          provide: OutputEventTypesService_2024_06_14,
          useValue: {},
        },
        {
          provide: PlatformBookingsService,
          useValue: {},
        },
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InputBookingsService_2024_08_13>(InputBookingsService_2024_08_13);
    apiKeysRepository = module.get<ApiKeysRepository>(ApiKeysRepository);
    oAuthFlowService = module.get<OAuthFlowService>(OAuthFlowService);
    usersRepository = module.get<UsersRepository>(UsersRepository);

    jest.clearAllMocks();
  });

  describe("getOwner", () => {
    const mockUser = { id: 42, uuid: "user-uuid-123", email: "test@example.com" };

    function createMockRequest(authHeader?: string): Request {
      return {
        get: jest.fn((header: string) => {
          if (header === "Authorization") return authHeader;
          return undefined;
        }),
      } as unknown as Request;
    }

    it("should return null when no Authorization header is present", async () => {
      const req = createMockRequest(undefined);

      const result = await service["getOwner"](req);

      expect(result).toBeNull();
    });

    it("should return null when Authorization header is empty", async () => {
      const req = createMockRequest("");

      const result = await service["getOwner"](req);

      expect(result).toBeNull();
    });

    describe("with API key", () => {
      beforeEach(() => {
        (isApiKey as jest.Mock).mockReturnValue(true);
      });

      it("should return { id, uuid } when API key resolves to a valid user", async () => {
        (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue({
          userId: 42,
        });
        (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);

        const req = createMockRequest("Bearer cal_test_abc123");

        const result = await service["getOwner"](req);

        expect(result).toEqual({ id: 42, uuid: "user-uuid-123" });
        expect(apiKeysRepository.getApiKeyFromHash).toHaveBeenCalledWith("hashed_abc123");
        expect(usersRepository.findById).toHaveBeenCalledWith(42);
      });

      it("should return null when API key is not found in database", async () => {
        (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest("Bearer cal_test_abc123");

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(usersRepository.findById).not.toHaveBeenCalled();
      });

      it("should return null when API key has no userId", async () => {
        (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue({
          userId: null,
        });

        const req = createMockRequest("Bearer cal_test_abc123");

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(usersRepository.findById).not.toHaveBeenCalled();
      });

      it("should return null when API key resolves to ownerId but user is not found", async () => {
        (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue({
          userId: 999,
        });
        (usersRepository.findById as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest("Bearer cal_test_abc123");

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(usersRepository.findById).toHaveBeenCalledWith(999);
      });
    });

    describe("with access token (OAuth)", () => {
      beforeEach(() => {
        (isApiKey as jest.Mock).mockReturnValue(false);
      });

      it("should return { id, uuid } when access token resolves to a valid user", async () => {
        (oAuthFlowService.getOwnerId as jest.Mock).mockResolvedValue(42);
        (usersRepository.findById as jest.Mock).mockResolvedValue(mockUser);

        const req = createMockRequest("Bearer some-access-token");

        const result = await service["getOwner"](req);

        expect(result).toEqual({ id: 42, uuid: "user-uuid-123" });
        expect(oAuthFlowService.getOwnerId).toHaveBeenCalledWith("some-access-token");
        expect(usersRepository.findById).toHaveBeenCalledWith(42);
      });

      it("should return null when access token does not resolve to an ownerId", async () => {
        (oAuthFlowService.getOwnerId as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest("Bearer some-access-token");

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(usersRepository.findById).not.toHaveBeenCalled();
      });

      it("should return null when access token resolves to ownerId but user is not found", async () => {
        (oAuthFlowService.getOwnerId as jest.Mock).mockResolvedValue(77);
        (usersRepository.findById as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest("Bearer some-access-token");

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(usersRepository.findById).toHaveBeenCalledWith(77);
      });
    });

    describe("error handling", () => {
      it("should return null and log error when an exception is thrown", async () => {
        (isApiKey as jest.Mock).mockReturnValue(false);
        (oAuthFlowService.getOwnerId as jest.Mock).mockRejectedValue(new Error("Token service down"));

        const req = createMockRequest("Bearer some-access-token");
        const loggerSpy = jest.spyOn(service["logger"], "error").mockImplementation(() => undefined);

        const result = await service["getOwner"](req);

        expect(result).toBeNull();
        expect(loggerSpy).toHaveBeenCalled();
      });
    });
  });
});
