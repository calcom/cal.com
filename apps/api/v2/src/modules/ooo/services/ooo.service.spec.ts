jest.mock("@calcom/platform-libraries", () => ({
  CreationSource: { API_V2: "API_V2" },
}));

import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { UsersRepository } from "@/modules/users/users.repository";

describe("UserOOOService", () => {
  let service: UserOOOService;
  let oooRepository: UserOOORepository;
  let usersRepository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOOOService,
        {
          provide: UserOOORepository,
          useValue: {
            createUserOOO: jest.fn(),
            updateUserOOO: jest.fn(),
            deleteUserOOO: jest.fn(),
            getUserOOOPaginated: jest.fn(),
            findExistingOooRedirect: jest.fn(),
            getOooByUserIdAndTime: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findUserOOORedirectEligible: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserOOOService>(UserOOOService);
    oooRepository = module.get<UserOOORepository>(UserOOORepository);
    usersRepository = module.get<UsersRepository>(UsersRepository);

    jest.clearAllMocks();
  });

  describe("formatOooReason", () => {
    it("should map reasonId 1 to UNSPECIFIED", () => {
      const result = service.formatOooReason({ reasonId: 1 } as never);
      expect(result.reason).toBe("unspecified");
    });

    it("should map reasonId 2 to vacation", () => {
      const result = service.formatOooReason({ reasonId: 2 } as never);
      expect(result.reason).toBe("vacation");
    });

    it("should map reasonId 3 to travel", () => {
      const result = service.formatOooReason({ reasonId: 3 } as never);
      expect(result.reason).toBe("travel");
    });

    it("should map reasonId 4 to sick", () => {
      const result = service.formatOooReason({ reasonId: 4 } as never);
      expect(result.reason).toBe("sick");
    });

    it("should map reasonId 5 to public_holiday", () => {
      const result = service.formatOooReason({ reasonId: 5 } as never);
      expect(result.reason).toBe("public_holiday");
    });

    it("should default to unspecified when reasonId is null", () => {
      const result = service.formatOooReason({ reasonId: null } as never);
      expect(result.reason).toBe("unspecified");
    });
  });

  describe("isStartBeforeEnd", () => {
    it("should return true when start is before end", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");
      expect(service.isStartBeforeEnd(start, end)).toBe(true);
    });

    it("should throw when start is after end", () => {
      const start = new Date("2024-01-10");
      const end = new Date("2024-01-01");
      expect(() => service.isStartBeforeEnd(start, end)).toThrow(BadRequestException);
    });

    it("should throw when only end is provided", () => {
      const end = new Date("2024-01-10");
      expect(() => service.isStartBeforeEnd(undefined, end)).toThrow(BadRequestException);
    });

    it("should throw when only start is provided", () => {
      const start = new Date("2024-01-01");
      expect(() => service.isStartBeforeEnd(start, undefined)).toThrow(BadRequestException);
    });

    it("should return true when both are undefined", () => {
      expect(service.isStartBeforeEnd(undefined, undefined)).toBe(true);
    });
  });

  describe("checkRedirectToSelf", () => {
    it("should throw when redirecting to self", () => {
      expect(() => service.checkRedirectToSelf(1, 1)).toThrow(BadRequestException);
    });

    it("should not throw when toUserId is different", () => {
      expect(() => service.checkRedirectToSelf(1, 2)).not.toThrow();
    });

    it("should not throw when toUserId is undefined", () => {
      expect(() => service.checkRedirectToSelf(1, undefined)).not.toThrow();
    });
  });

  describe("checkUserEligibleForRedirect", () => {
    it("should not throw when toUserId is undefined", async () => {
      await expect(service.checkUserEligibleForRedirect(1, undefined)).resolves.not.toThrow();
    });

    it("should not throw when user is eligible", async () => {
      (usersRepository.findUserOOORedirectEligible as jest.Mock).mockResolvedValue({ id: 2 });

      await expect(service.checkUserEligibleForRedirect(1, 2)).resolves.not.toThrow();
    });

    it("should throw BadRequestException when user is not eligible", async () => {
      (usersRepository.findUserOOORedirectEligible as jest.Mock).mockResolvedValue(null);

      await expect(service.checkUserEligibleForRedirect(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe("checkExistingOooRedirect", () => {
    it("should not throw when no overlap exists", async () => {
      (oooRepository.findExistingOooRedirect as jest.Mock).mockResolvedValue(null);
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");

      await expect(service.checkExistingOooRedirect(1, start, end, 2)).resolves.not.toThrow();
    });

    it("should throw BadRequestException when overlapping redirect exists", async () => {
      (oooRepository.findExistingOooRedirect as jest.Mock).mockResolvedValue({ id: 1 });
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");

      await expect(service.checkExistingOooRedirect(1, start, end, 2)).rejects.toThrow(BadRequestException);
    });

    it("should skip check when start/end are undefined", async () => {
      await service.checkExistingOooRedirect(1, undefined, undefined, 2);
      expect(oooRepository.findExistingOooRedirect).not.toHaveBeenCalled();
    });
  });

  describe("checkDuplicateOOOEntry", () => {
    it("should not throw when no duplicate exists", async () => {
      (oooRepository.getOooByUserIdAndTime as jest.Mock).mockResolvedValue(null);
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");

      await expect(service.checkDuplicateOOOEntry(1, start, end)).resolves.not.toThrow();
    });

    it("should throw ConflictException when duplicate exists", async () => {
      (oooRepository.getOooByUserIdAndTime as jest.Mock).mockResolvedValue({ id: 1 });
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-10");

      await expect(service.checkDuplicateOOOEntry(1, start, end)).rejects.toThrow(ConflictException);
    });
  });

  describe("createUserOOO", () => {
    it("should create OOO entry with correct reason mapping", async () => {
      const mockOoo = { id: 1, reasonId: 2, start: new Date(), end: new Date() };
      (oooRepository.findExistingOooRedirect as jest.Mock).mockResolvedValue(null);
      (oooRepository.getOooByUserIdAndTime as jest.Mock).mockResolvedValue(null);
      (oooRepository.createUserOOO as jest.Mock).mockResolvedValue(mockOoo);

      const result = await service.createUserOOO(1, {
        start: new Date("2024-01-01"),
        end: new Date("2024-01-10"),
        reason: "vacation",
      } as never);

      expect(result.reason).toBe("vacation");
      expect(oooRepository.createUserOOO).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, reasonId: 2 })
      );
    });
  });

  describe("deleteUserOOO", () => {
    it("should delete and format OOO entry", async () => {
      const mockOoo = { id: 1, reasonId: 3 };
      (oooRepository.deleteUserOOO as jest.Mock).mockResolvedValue(mockOoo);

      const result = await service.deleteUserOOO(1);

      expect(result.reason).toBe("travel");
      expect(oooRepository.deleteUserOOO).toHaveBeenCalledWith(1);
    });
  });

  describe("getUserOOOPaginated", () => {
    it("should return paginated OOO entries with formatted reasons", async () => {
      const mockOoos = [
        { id: 1, reasonId: 1 },
        { id: 2, reasonId: 4 },
      ];
      (oooRepository.getUserOOOPaginated as jest.Mock).mockResolvedValue(mockOoos);

      const result = await service.getUserOOOPaginated(1, 0, 10);

      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe("unspecified");
      expect(result[1].reason).toBe("sick");
    });

    it("should pass sort parameters", async () => {
      (oooRepository.getUserOOOPaginated as jest.Mock).mockResolvedValue([]);

      await service.getUserOOOPaginated(1, 0, 10, { sortStart: "asc" });

      expect(oooRepository.getUserOOOPaginated).toHaveBeenCalledWith(1, 0, 10, { sortStart: "asc" });
    });
  });
});
