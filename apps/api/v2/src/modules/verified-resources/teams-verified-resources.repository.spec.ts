import { Test, TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";

describe("TeamsVerifiedResourcesRepository", () => {
  let repository: TeamsVerifiedResourcesRepository;
  let mockPrismaRead: {
    prisma: {
      verifiedEmail: Record<string, jest.Mock>;
      verifiedNumber: Record<string, jest.Mock>;
    };
  };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        verifiedEmail: {
          findMany: jest.fn(),
          findFirstOrThrow: jest.fn(),
          findFirst: jest.fn(),
        },
        verifiedNumber: {
          findMany: jest.fn(),
          findFirstOrThrow: jest.fn(),
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsVerifiedResourcesRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: {} },
      ],
    }).compile();

    repository = module.get<TeamsVerifiedResourcesRepository>(TeamsVerifiedResourcesRepository);
    jest.clearAllMocks();
  });

  describe("getTeamVerifiedEmails", () => {
    it("should return paginated verified emails for team", async () => {
      const mockEmails = [{ id: 1, email: "a@test.com" }];
      mockPrismaRead.prisma.verifiedEmail.findMany.mockResolvedValue(mockEmails);

      const result = await repository.getTeamVerifiedEmails(5, 0, 10);

      expect(mockPrismaRead.prisma.verifiedEmail.findMany).toHaveBeenCalledWith({
        where: { teamId: 5 },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(mockEmails);
    });
  });

  describe("getTeamVerifiedPhoneNumbers", () => {
    it("should return paginated verified phone numbers for team", async () => {
      mockPrismaRead.prisma.verifiedNumber.findMany.mockResolvedValue([]);

      await repository.getTeamVerifiedPhoneNumbers(5, 0, 10);

      expect(mockPrismaRead.prisma.verifiedNumber.findMany).toHaveBeenCalledWith({
        where: { teamId: 5 },
        skip: 0,
        take: 10,
      });
    });
  });

  describe("getTeamVerifiedEmail", () => {
    it("should find verified email by userId, email, and teamId", async () => {
      mockPrismaRead.prisma.verifiedEmail.findFirstOrThrow.mockResolvedValue({
        id: 1,
        email: "a@test.com",
      });

      const result = await repository.getTeamVerifiedEmail(1, "a@test.com", 5);

      expect(mockPrismaRead.prisma.verifiedEmail.findFirstOrThrow).toHaveBeenCalledWith({
        where: { userId: 1, email: "a@test.com", teamId: 5 },
      });
      expect(result.email).toBe("a@test.com");
    });
  });

  describe("getTeamVerifiedPhoneNumber", () => {
    it("should find verified phone number by userId, phone, and teamId", async () => {
      mockPrismaRead.prisma.verifiedNumber.findFirstOrThrow.mockResolvedValue({
        phoneNumber: "+123",
      });

      await repository.getTeamVerifiedPhoneNumber(1, "+123", 5);

      expect(mockPrismaRead.prisma.verifiedNumber.findFirstOrThrow).toHaveBeenCalledWith({
        where: { userId: 1, phoneNumber: "+123", teamId: 5 },
      });
    });
  });

  describe("getTeamVerifiedEmailById", () => {
    it("should find verified email by id and teamId", async () => {
      mockPrismaRead.prisma.verifiedEmail.findFirst.mockResolvedValue({ id: 10, teamId: 5 });

      await repository.getTeamVerifiedEmailById(10, 5);

      expect(mockPrismaRead.prisma.verifiedEmail.findFirst).toHaveBeenCalledWith({
        where: { id: 10, teamId: 5 },
      });
    });
  });

  describe("getTeamVerifiedPhoneNumberById", () => {
    it("should find verified phone by id and teamId", async () => {
      mockPrismaRead.prisma.verifiedNumber.findFirst.mockResolvedValue({ id: 10, teamId: 5 });

      await repository.getTeamVerifiedPhoneNumberById(10, 5);

      expect(mockPrismaRead.prisma.verifiedNumber.findFirst).toHaveBeenCalledWith({
        where: { id: 10, teamId: 5 },
      });
    });
  });
});
