import { Test, TestingModule } from "@nestjs/testing";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

describe("ApiKeysRepository", () => {
  let repository: ApiKeysRepository;
  let mockPrismaRead: { prisma: { apiKey: Record<string, jest.Mock> } };
  let mockPrismaWrite: { prisma: { apiKey: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        apiKey: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    mockPrismaWrite = {
      prisma: {
        apiKey: {
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
      ],
    }).compile();

    repository = module.get<ApiKeysRepository>(ApiKeysRepository);
    jest.clearAllMocks();
  });

  describe("getApiKeyFromHash", () => {
    it("should find API key by hashed key", async () => {
      const mockKey = { id: "key-1", hashedKey: "abc123", userId: 1 };
      mockPrismaRead.prisma.apiKey.findUnique.mockResolvedValue(mockKey);

      const result = await repository.getApiKeyFromHash("abc123");

      expect(mockPrismaRead.prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { hashedKey: "abc123" },
      });
      expect(result).toEqual(mockKey);
    });

    it("should return null when key not found", async () => {
      mockPrismaRead.prisma.apiKey.findUnique.mockResolvedValue(null);

      const result = await repository.getApiKeyFromHash("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getTeamApiKeys", () => {
    it("should return all API keys for a team", async () => {
      const mockKeys = [
        { id: "key-1", teamId: 5 },
        { id: "key-2", teamId: 5 },
      ];
      mockPrismaRead.prisma.apiKey.findMany.mockResolvedValue(mockKeys);

      const result = await repository.getTeamApiKeys(5);

      expect(mockPrismaRead.prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { teamId: 5 },
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no keys exist", async () => {
      mockPrismaRead.prisma.apiKey.findMany.mockResolvedValue([]);

      const result = await repository.getTeamApiKeys(999);
      expect(result).toHaveLength(0);
    });
  });

  describe("deleteById", () => {
    it("should delete API key by id", async () => {
      mockPrismaWrite.prisma.apiKey.delete.mockResolvedValue({ id: "key-1" });

      await repository.deleteById("key-1");

      expect(mockPrismaWrite.prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key-1" },
      });
    });
  });
});
