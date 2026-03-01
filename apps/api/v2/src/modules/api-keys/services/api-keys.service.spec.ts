jest.mock("@calcom/platform-libraries", () => ({
  createApiKeyHandler: jest.fn(),
}));

jest.mock("@/lib/api-key", () => ({
  sha256Hash: jest.fn((val: string) => `hashed_${val}`),
  stripApiKey: jest.fn((key: string) => key.replace("cal_test_", "")),
}));

jest.mock("@/lib/enums/auth-methods", () => ({
  AuthMethods: { API_KEY: "API_KEY", ACCESS_TOKEN: "ACCESS_TOKEN" },
}));

import { createApiKeyHandler } from "@calcom/platform-libraries";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { ApiKeysService } from "@/modules/api-keys/services/api-keys.service";

describe("ApiKeysService", () => {
  let service: ApiKeysService;
  let apiKeysRepository: ApiKeysRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: ApiKeysRepository,
          useValue: {
            getApiKeyFromHash: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "api.keyPrefix") return "cal_test_";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    apiKeysRepository = module.get<ApiKeysRepository>(ApiKeysRepository);

    jest.clearAllMocks();
  });

  describe("getRequestApiKey", () => {
    it("should return API key from Authorization header", async () => {
      const mockRequest = {
        authMethod: "API_KEY",
        get: jest.fn().mockReturnValue("Bearer cal_test_abc123"),
      } as never;

      const result = await service.getRequestApiKey(mockRequest);
      expect(result).toBe("cal_test_abc123");
    });

    it("should throw UnauthorizedException when auth method is not API_KEY", async () => {
      const mockRequest = {
        authMethod: "ACCESS_TOKEN",
        get: jest.fn(),
      } as never;

      await expect(service.getRequestApiKey(mockRequest)).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when no Authorization header", async () => {
      const mockRequest = {
        authMethod: "API_KEY",
        get: jest.fn().mockReturnValue(undefined),
      } as never;

      await expect(service.getRequestApiKey(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("createApiKey", () => {
    it("should create API key with expiration", async () => {
      const mockApiKey = { id: "key-1", hashedKey: "abc" };
      (createApiKeyHandler as jest.Mock).mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(1, { apiKeyDaysValid: 60 });

      expect(createApiKeyHandler).toHaveBeenCalledWith({
        ctx: { user: { id: 1 } },
        input: expect.objectContaining({
          neverExpires: false,
        }),
      });
      expect(result).toEqual(mockApiKey);
    });

    it("should create API key that never expires", async () => {
      const mockApiKey = { id: "key-1" };
      (createApiKeyHandler as jest.Mock).mockResolvedValue(mockApiKey);

      await service.createApiKey(1, { apiKeyNeverExpires: true });

      expect(createApiKeyHandler).toHaveBeenCalledWith({
        ctx: { user: { id: 1 } },
        input: expect.objectContaining({
          neverExpires: true,
        }),
      });
    });

    it("should throw BadRequestException when both apiKeyDaysValid and apiKeyNeverExpires are set", async () => {
      await expect(
        service.createApiKey(1, { apiKeyDaysValid: 30, apiKeyNeverExpires: true })
      ).rejects.toThrow(BadRequestException);
    });

    it("should default to 30 days when no expiration specified", async () => {
      (createApiKeyHandler as jest.Mock).mockResolvedValue({ id: "key-1" });

      await service.createApiKey(1, {});

      expect(createApiKeyHandler).toHaveBeenCalledWith({
        ctx: { user: { id: 1 } },
        input: expect.objectContaining({
          neverExpires: false,
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe("refreshApiKey", () => {
    it("should refresh API key by creating new and deleting old", async () => {
      const mockExistingKey = { id: "old-key", note: "My Key", teamId: 5 };
      const mockNewKey = { id: "new-key" };
      (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue(mockExistingKey);
      (createApiKeyHandler as jest.Mock).mockResolvedValue(mockNewKey);
      (apiKeysRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

      const result = await service.refreshApiKey(1, "cal_test_abc123", { apiKeyDaysValid: 30 });

      expect(apiKeysRepository.deleteById).toHaveBeenCalledWith("old-key");
      expect(result).toEqual(mockNewKey);
    });

    it("should throw UnauthorizedException when API key not found in database", async () => {
      (apiKeysRepository.getApiKeyFromHash as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshApiKey(1, "cal_test_invalid", {})).rejects.toThrow(UnauthorizedException);
    });
  });
});
