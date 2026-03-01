import { Test, TestingModule } from "@nestjs/testing";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

describe("MembershipsRepository", () => {
  let repository: MembershipsRepository;
  let mockPrismaRead: { prisma: { membership: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        membership: {
          findUniqueOrThrow: jest.fn(),
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MembershipsRepository, { provide: PrismaReadService, useValue: mockPrismaRead }],
    }).compile();

    repository = module.get<MembershipsRepository>(MembershipsRepository);
    jest.clearAllMocks();
  });

  describe("findOrgUserMembership", () => {
    it("should find membership by userId and teamId", async () => {
      const mockMembership = { userId: 1, teamId: 10, role: "MEMBER" };
      mockPrismaRead.prisma.membership.findUniqueOrThrow.mockResolvedValue(mockMembership);

      const result = await repository.findOrgUserMembership(10, 1);

      expect(mockPrismaRead.prisma.membership.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 10 } },
      });
      expect(result).toEqual(mockMembership);
    });

    it("should throw when membership not found", async () => {
      mockPrismaRead.prisma.membership.findUniqueOrThrow.mockRejectedValue(new Error("Record not found"));

      await expect(repository.findOrgUserMembership(10, 999)).rejects.toThrow();
    });
  });

  describe("findPlatformOwnerUserId", () => {
    it("should return owner userId", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue({ userId: 1 });

      const result = await repository.findPlatformOwnerUserId(10);

      expect(mockPrismaRead.prisma.membership.findFirst).toHaveBeenCalledWith({
        where: { teamId: 10, role: "OWNER", accepted: true },
        select: { userId: true },
      });
      expect(result).toBe(1);
    });

    it("should return undefined when no owner found", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue(null);

      const result = await repository.findPlatformOwnerUserId(10);
      expect(result).toBeUndefined();
    });
  });

  describe("findPlatformAdminUserId", () => {
    it("should return admin userId", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue({ userId: 2 });

      const result = await repository.findPlatformAdminUserId(10);
      expect(result).toBe(2);
    });

    it("should return undefined when no admin found", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue(null);

      const result = await repository.findPlatformAdminUserId(10);
      expect(result).toBeUndefined();
    });
  });

  describe("isUserOrganizationAdmin", () => {
    it("should return true when user is admin", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue({ role: "ADMIN" });

      const result = await repository.isUserOrganizationAdmin(1, 10);
      expect(result).toBe(true);
    });

    it("should return true when user is owner", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue({ role: "OWNER" });

      const result = await repository.isUserOrganizationAdmin(1, 10);
      expect(result).toBe(true);
    });

    it("should return false when user is not admin/owner", async () => {
      mockPrismaRead.prisma.membership.findFirst.mockResolvedValue(null);

      const result = await repository.isUserOrganizationAdmin(1, 10);
      expect(result).toBe(false);
    });
  });

  describe("getOrgIdsWhereUserIsAdminOrOwner", () => {
    it("should return team IDs where user is admin or owner", async () => {
      mockPrismaRead.prisma.membership.findMany.mockResolvedValue([{ teamId: 10 }, { teamId: 20 }]);

      const result = await repository.getOrgIdsWhereUserIsAdminOrOwner(1);
      expect(result).toEqual([10, 20]);
    });

    it("should return empty array when user has no admin roles", async () => {
      mockPrismaRead.prisma.membership.findMany.mockResolvedValue([]);

      const result = await repository.getOrgIdsWhereUserIsAdminOrOwner(1);
      expect(result).toEqual([]);
    });
  });

  describe("createMembership", () => {
    it("should create a new membership", async () => {
      const mockMembership = { userId: 1, teamId: 10, role: "MEMBER", accepted: true };
      mockPrismaRead.prisma.membership.create.mockResolvedValue(mockMembership);

      const result = await repository.createMembership(10, 1, "MEMBER" as never, true);

      expect(mockPrismaRead.prisma.membership.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: "MEMBER",
          teamId: 10,
          userId: 1,
          accepted: true,
        }),
      });
      expect(result).toEqual(mockMembership);
    });
  });

  describe("findMembershipByOrgId", () => {
    it("should delegate to findMembershipByTeamId", async () => {
      const mockMembership = { userId: 1, teamId: 10 };
      mockPrismaRead.prisma.membership.findUnique.mockResolvedValue(mockMembership);

      const result = await repository.findMembershipByOrgId(10, 1);

      expect(mockPrismaRead.prisma.membership.findUnique).toHaveBeenCalledWith({
        where: { userId_teamId: { userId: 1, teamId: 10 } },
      });
      expect(result).toEqual(mockMembership);
    });
  });
});
