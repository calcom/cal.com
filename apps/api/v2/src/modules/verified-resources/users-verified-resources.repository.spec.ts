import { Test, TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersVerifiedResourcesRepository } from "@/modules/verified-resources/users-verified-resources.repository";

describe("UsersVerifiedResourcesRepository", () => {
  let repository: UsersVerifiedResourcesRepository;
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
        UsersVerifiedResourcesRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: {} },
      ],
    }).compile();

    repository = module.get<UsersVerifiedResourcesRepository>(UsersVerifiedResourcesRepository);
    jest.clearAllMocks();
  });

  describe("getUserVerifiedEmails", () => {
    it("should return paginated verified emails for user", async () => {
      const mockEmails = [{ id: 1, email: "a@test.com" }];
      mockPrismaRead.prisma.verifiedEmail.findMany.mockResolvedValue(mockEmails);

      const result = await repository.getUserVerifiedEmails(1, 0, 10);

      expect(mockPrismaRead.prisma.verifiedEmail.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(mockEmails);
    });
  });

  describe("getUserVerifiedPhoneNumber", () => {
    it("should find verified phone by userId and phone", async () => {
      mockPrismaRead.prisma.verifiedNumber.findFirstOrThrow.mockResolvedValue({
        phoneNumber: "+123",
      });

      await repository.getUserVerifiedPhoneNumber(1, "+123");

      expect(mockPrismaRead.prisma.verifiedNumber.findFirstOrThrow).toHaveBeenCalledWith({
        where: { userId: 1, phoneNumber: "+123" },
      });
    });
  });

  describe("getUserVerifiedPhoneNumbers", () => {
    it("should return paginated verified phone numbers", async () => {
      mockPrismaRead.prisma.verifiedNumber.findMany.mockResolvedValue([]);

      await repository.getUserVerifiedPhoneNumbers(1, 0, 10);

      expect(mockPrismaRead.prisma.verifiedNumber.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        skip: 0,
        take: 10,
      });
    });
  });

  describe("getUserVerifiedEmail", () => {
    it("should find verified email by userId and email", async () => {
      mockPrismaRead.prisma.verifiedEmail.findFirstOrThrow.mockResolvedValue({
        email: "a@test.com",
      });

      await repository.getUserVerifiedEmail(1, "a@test.com");

      expect(mockPrismaRead.prisma.verifiedEmail.findFirstOrThrow).toHaveBeenCalledWith({
        where: { userId: 1, email: "a@test.com" },
      });
    });
  });

  describe("getUserVerifiedEmailById", () => {
    it("should find verified email by userId and id", async () => {
      mockPrismaRead.prisma.verifiedEmail.findFirst.mockResolvedValue({ id: 10 });

      await repository.getUserVerifiedEmailById(1, 10);

      expect(mockPrismaRead.prisma.verifiedEmail.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, id: 10 },
      });
    });
  });

  describe("getUserVerifiedPhoneNumberById", () => {
    it("should find verified phone by userId and id", async () => {
      mockPrismaRead.prisma.verifiedNumber.findFirst.mockResolvedValue({ id: 10 });

      await repository.getUserVerifiedPhoneNumberById(1, 10);

      expect(mockPrismaRead.prisma.verifiedNumber.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, id: 10 },
      });
    });
  });
});
