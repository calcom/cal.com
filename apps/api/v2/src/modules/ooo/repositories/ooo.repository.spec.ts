import { Test, TestingModule } from "@nestjs/testing";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

describe("UserOOORepository", () => {
  let repository: UserOOORepository;
  let mockPrismaRead: { prisma: { outOfOfficeEntry: Record<string, jest.Mock> } };
  let mockPrismaWrite: { prisma: { outOfOfficeEntry: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        outOfOfficeEntry: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    mockPrismaWrite = {
      prisma: {
        outOfOfficeEntry: {
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOOORepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
      ],
    }).compile();

    repository = module.get<UserOOORepository>(UserOOORepository);
    jest.clearAllMocks();
  });

  describe("createUserOOO", () => {
    it("should create OOO entry with generated UUID", async () => {
      const mockOoo = { id: 1, uuid: "generated-uuid", userId: 1 };
      mockPrismaWrite.prisma.outOfOfficeEntry.create.mockResolvedValue(mockOoo);

      const result = await repository.createUserOOO({
        userId: 1,
        start: new Date("2024-01-01"),
        end: new Date("2024-01-10"),
        reasonId: 2,
      });

      expect(mockPrismaWrite.prisma.outOfOfficeEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          uuid: expect.any(String),
        }),
        include: { reason: true },
      });
      expect(result).toEqual(mockOoo);
    });
  });

  describe("updateUserOOO", () => {
    it("should update OOO entry by id", async () => {
      const mockOoo = { id: 1, reasonId: 3 };
      mockPrismaWrite.prisma.outOfOfficeEntry.update.mockResolvedValue(mockOoo);

      const result = await repository.updateUserOOO(1, { reasonId: 3 });

      expect(mockPrismaWrite.prisma.outOfOfficeEntry.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { reasonId: 3 },
        include: { reason: true },
      });
      expect(result).toEqual(mockOoo);
    });
  });

  describe("getUserOOOById", () => {
    it("should find OOO entry by id", async () => {
      mockPrismaRead.prisma.outOfOfficeEntry.findFirst.mockResolvedValue({ id: 1 });

      const result = await repository.getUserOOOById(1);

      expect(mockPrismaRead.prisma.outOfOfficeEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { reason: true },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe("getUserOOOByIdAndUserId", () => {
    it("should find OOO entry by id and userId", async () => {
      mockPrismaRead.prisma.outOfOfficeEntry.findFirst.mockResolvedValue({ id: 1, userId: 5 });

      await repository.getUserOOOByIdAndUserId(1, 5);

      expect(mockPrismaRead.prisma.outOfOfficeEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 5 },
        include: { reason: true },
      });
    });
  });

  describe("getUserOOOPaginated", () => {
    it("should return paginated results with sort", async () => {
      mockPrismaRead.prisma.outOfOfficeEntry.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await repository.getUserOOOPaginated(1, 0, 10, { sortStart: "asc" });

      expect(mockPrismaRead.prisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
          skip: 0,
          take: 10,
          include: { reason: true },
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteUserOOO", () => {
    it("should delete OOO entry by id", async () => {
      mockPrismaWrite.prisma.outOfOfficeEntry.delete.mockResolvedValue({ id: 1 });

      await repository.deleteUserOOO(1);

      expect(mockPrismaWrite.prisma.outOfOfficeEntry.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { reason: true },
      });
    });
  });

  describe("findExistingOooRedirect", () => {
    it("should find overlapping OOO redirect", async () => {
      mockPrismaRead.prisma.outOfOfficeEntry.findFirst.mockResolvedValue({ userId: 2, toUserId: 1 });

      const result = await repository.findExistingOooRedirect(
        1,
        new Date("2024-01-01"),
        new Date("2024-01-10"),
        2
      );

      expect(mockPrismaRead.prisma.outOfOfficeEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { userId: true, toUserId: true },
          where: expect.objectContaining({ toUserId: 1 }),
        })
      );
      expect(result).toBeDefined();
    });

    it("should return null when no overlap exists", async () => {
      mockPrismaRead.prisma.outOfOfficeEntry.findFirst.mockResolvedValue(null);

      const result = await repository.findExistingOooRedirect(
        1,
        new Date("2024-01-01"),
        new Date("2024-01-10")
      );
      expect(result).toBeNull();
    });
  });

  describe("getOooByUserIdAndTime", () => {
    it("should find OOO entry by userId and exact time range", async () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");
      mockPrismaRead.prisma.outOfOfficeEntry.findFirst.mockResolvedValue({ id: 1 });

      await repository.getOooByUserIdAndTime(1, start, end);

      expect(mockPrismaRead.prisma.outOfOfficeEntry.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, start, end },
      });
    });
  });
});
