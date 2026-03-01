import { Test, TestingModule } from "@nestjs/testing";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

describe("AppsRepository", () => {
  let repository: AppsRepository;
  let mockPrismaRead: { prisma: { app: Record<string, jest.Mock> } };
  let mockPrismaWrite: {
    prisma: { credential: Record<string, jest.Mock> };
  };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        app: {
          findUnique: jest.fn(),
        },
      },
    };

    mockPrismaWrite = {
      prisma: {
        credential: {
          create: jest.fn(),
          deleteMany: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
      ],
    }).compile();

    repository = module.get<AppsRepository>(AppsRepository);
    jest.clearAllMocks();
  });

  describe("getAppBySlug", () => {
    it("should return app when found", async () => {
      const mockApp = { slug: "stripe", keys: { client_id: "test" } };
      mockPrismaRead.prisma.app.findUnique.mockResolvedValue(mockApp);

      const result = await repository.getAppBySlug("stripe");

      expect(mockPrismaRead.prisma.app.findUnique).toHaveBeenCalledWith({ where: { slug: "stripe" } });
      expect(result).toEqual(mockApp);
    });

    it("should return null when app not found", async () => {
      mockPrismaRead.prisma.app.findUnique.mockResolvedValue(null);

      const result = await repository.getAppBySlug("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createAppCredential", () => {
    it("should create credential for user", async () => {
      const mockCred = { id: 1, type: "stripe_payment", userId: 1 };
      mockPrismaWrite.prisma.credential.create.mockResolvedValue(mockCred);

      const result = await repository.createAppCredential("stripe_payment", { key: "val" }, 1, "stripe");

      expect(mockPrismaWrite.prisma.credential.create).toHaveBeenCalledWith({
        data: { type: "stripe_payment", key: { key: "val" }, userId: 1, appId: "stripe" },
      });
      expect(result).toEqual(mockCred);
    });
  });

  describe("createTeamAppCredential", () => {
    it("should create credential for team", async () => {
      mockPrismaWrite.prisma.credential.create.mockResolvedValue({ id: 1, teamId: 5 });

      await repository.createTeamAppCredential("stripe_payment", { key: "val" }, 5, "stripe");

      expect(mockPrismaWrite.prisma.credential.create).toHaveBeenCalledWith({
        data: { type: "stripe_payment", key: { key: "val" }, teamId: 5, appId: "stripe" },
      });
    });
  });

  describe("deleteAppCredentials", () => {
    it("should delete credentials by IDs and userId", async () => {
      mockPrismaWrite.prisma.credential.deleteMany.mockResolvedValue({ count: 2 });

      const result = await repository.deleteAppCredentials([1, 2], 1);

      expect(mockPrismaWrite.prisma.credential.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, userId: 1 },
      });
      expect(result).toEqual({ count: 2 });
    });
  });

  describe("deleteTeamAppCredentials", () => {
    it("should delete credentials by IDs and teamId", async () => {
      mockPrismaWrite.prisma.credential.deleteMany.mockResolvedValue({ count: 1 });

      await repository.deleteTeamAppCredentials([3], 5);

      expect(mockPrismaWrite.prisma.credential.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [3] }, teamId: 5 },
      });
    });
  });

  describe("findAppCredential", () => {
    it("should find credentials by type, appId, and userId", async () => {
      mockPrismaWrite.prisma.credential.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await repository.findAppCredential({
        type: "stripe_payment",
        appId: "stripe",
        userId: 1,
      });

      expect(mockPrismaWrite.prisma.credential.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { type: "stripe_payment", userId: 1, teamId: undefined, appId: "stripe" },
      });
      expect(result).toHaveLength(1);
    });

    it("should find credentials by type, appId, and teamId", async () => {
      mockPrismaWrite.prisma.credential.findMany.mockResolvedValue([{ id: 2 }]);

      await repository.findAppCredential({
        type: "stripe_payment",
        appId: "stripe",
        teamId: 5,
      });

      expect(mockPrismaWrite.prisma.credential.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { type: "stripe_payment", userId: undefined, teamId: 5, appId: "stripe" },
      });
    });
  });
});
