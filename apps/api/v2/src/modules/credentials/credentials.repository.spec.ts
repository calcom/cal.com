import { Test, TestingModule } from "@nestjs/testing";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

describe("CredentialsRepository", () => {
  let repository: CredentialsRepository;
  let mockPrismaRead: { prisma: { credential: Record<string, jest.Mock> } };
  let mockPrismaWrite: { prisma: { credential: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        credential: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
      },
    };

    mockPrismaWrite = {
      prisma: {
        credential: {
          upsert: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
      ],
    }).compile();

    repository = module.get<CredentialsRepository>(CredentialsRepository);
    jest.clearAllMocks();
  });

  describe("upsertUserAppCredential", () => {
    it("should upsert credential for user", async () => {
      const mockCred = { id: 1, type: "google_calendar", userId: 1 };
      mockPrismaWrite.prisma.credential.upsert.mockResolvedValue(mockCred);

      const result = await repository.upsertUserAppCredential("google_calendar", { key: "val" }, 1, 5);

      expect(mockPrismaWrite.prisma.credential.upsert).toHaveBeenCalledWith({
        create: expect.objectContaining({ type: "google_calendar", userId: 1 }),
        update: expect.objectContaining({ key: { key: "val" }, invalid: false }),
        where: { id: 5 },
      });
      expect(result).toEqual(mockCred);
    });

    it("should use id 0 when credentialId is null", async () => {
      mockPrismaWrite.prisma.credential.upsert.mockResolvedValue({ id: 1 });

      await repository.upsertUserAppCredential("google_calendar", {}, 1, null);

      expect(mockPrismaWrite.prisma.credential.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 0 } })
      );
    });

    it("should use id 0 when credentialId is undefined", async () => {
      mockPrismaWrite.prisma.credential.upsert.mockResolvedValue({ id: 1 });

      await repository.upsertUserAppCredential("google_calendar", {}, 1);

      expect(mockPrismaWrite.prisma.credential.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 0 } })
      );
    });
  });

  describe("upsertTeamAppCredential", () => {
    it("should upsert credential for team", async () => {
      mockPrismaWrite.prisma.credential.upsert.mockResolvedValue({ id: 2, teamId: 5 });

      await repository.upsertTeamAppCredential("google_calendar", { key: "val" }, 5, 10);

      expect(mockPrismaWrite.prisma.credential.upsert).toHaveBeenCalledWith({
        create: expect.objectContaining({ teamId: 5 }),
        update: expect.objectContaining({ key: { key: "val" }, invalid: false }),
        where: { id: 10 },
      });
    });
  });

  describe("find methods", () => {
    it("findCredentialByTypeAndUserId should query by type and userId", async () => {
      mockPrismaWrite.prisma.credential.findFirst.mockResolvedValue({ id: 1 });

      await repository.findCredentialByTypeAndUserId("google_calendar", 1);

      expect(mockPrismaWrite.prisma.credential.findFirst).toHaveBeenCalledWith({
        where: { type: "google_calendar", userId: 1 },
      });
    });

    it("findAllCredentialsByTypeAndUserId should query all by type and userId", async () => {
      mockPrismaWrite.prisma.credential.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await repository.findAllCredentialsByTypeAndUserId("google_calendar", 1);

      expect(result).toHaveLength(2);
    });

    it("findCredentialByTypeAndTeamId should query by type and teamId", async () => {
      mockPrismaWrite.prisma.credential.findFirst.mockResolvedValue({ id: 1 });

      await repository.findCredentialByTypeAndTeamId("google_calendar", 5);

      expect(mockPrismaWrite.prisma.credential.findFirst).toHaveBeenCalledWith({
        where: { type: "google_calendar", teamId: 5 },
      });
    });
  });

  describe("getUserCredentialsByIds", () => {
    it("should filter credentials by userId and IDs", async () => {
      mockPrismaRead.prisma.credential.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);

      const result = await repository.getUserCredentialsByIds(1, [1, 3]);

      expect(mockPrismaRead.prisma.credential.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 3] }, userId: 1 },
        select: expect.objectContaining({ id: true, type: true, key: true }),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getAllUserCredentialsById", () => {
    it("should return all credentials ordered by id asc", async () => {
      mockPrismaRead.prisma.credential.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await repository.getAllUserCredentialsById(1);

      expect(mockPrismaRead.prisma.credential.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: expect.anything(),
        orderBy: { id: "asc" },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteUserCredentialById", () => {
    it("should delete credential by id and userId", async () => {
      mockPrismaWrite.prisma.credential.delete.mockResolvedValue({ id: 1 });

      await repository.deleteUserCredentialById(1, 5);

      expect(mockPrismaWrite.prisma.credential.delete).toHaveBeenCalledWith({
        where: { id: 5, userId: 1 },
      });
    });
  });
});
