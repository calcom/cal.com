import { Test, TestingModule } from "@nestjs/testing";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";

describe("MembershipsService", () => {
  let service: MembershipsService;
  let membershipsRepository: MembershipsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        {
          provide: MembershipsRepository,
          useValue: {
            findUserMemberships: jest.fn(),
            getOrgIdsWhereUserIsAdminOrOwner: jest.fn(),
            getUserMembershipInOneOfOrgs: jest.fn(),
            getUserMembershipInOneOfOrgsTeams: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
    membershipsRepository = module.get<MembershipsRepository>(MembershipsRepository);

    jest.clearAllMocks();
  });

  describe("haveMembershipsInCommon", () => {
    it("should return true when users share a team membership", async () => {
      (membershipsRepository.findUserMemberships as jest.Mock)
        .mockResolvedValueOnce([
          { teamId: 1, accepted: true },
          { teamId: 2, accepted: true },
        ])
        .mockResolvedValueOnce([
          { teamId: 2, accepted: true },
          { teamId: 3, accepted: true },
        ]);

      const result = await service.haveMembershipsInCommon(1, 2);
      expect(result).toBe(true);
    });

    it("should return false when users share no team memberships", async () => {
      (membershipsRepository.findUserMemberships as jest.Mock)
        .mockResolvedValueOnce([{ teamId: 1, accepted: true }])
        .mockResolvedValueOnce([{ teamId: 2, accepted: true }]);

      const result = await service.haveMembershipsInCommon(1, 2);
      expect(result).toBe(false);
    });

    it("should exclude non-accepted memberships", async () => {
      (membershipsRepository.findUserMemberships as jest.Mock)
        .mockResolvedValueOnce([{ teamId: 1, accepted: false }])
        .mockResolvedValueOnce([{ teamId: 1, accepted: true }]);

      const result = await service.haveMembershipsInCommon(1, 2);
      expect(result).toBe(false);
    });

    it("should return false when both users have no memberships", async () => {
      (membershipsRepository.findUserMemberships as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.haveMembershipsInCommon(1, 2);
      expect(result).toBe(false);
    });
  });

  describe("membershipsInCommon", () => {
    it("should return only common accepted memberships by teamId", async () => {
      (membershipsRepository.findUserMemberships as jest.Mock)
        .mockResolvedValueOnce([
          { teamId: 1, accepted: true },
          { teamId: 2, accepted: true },
          { teamId: 3, accepted: false },
        ])
        .mockResolvedValueOnce([
          { teamId: 2, accepted: true },
          { teamId: 3, accepted: true },
          { teamId: 4, accepted: true },
        ]);

      const result = await service.membershipsInCommon(1, 2);
      expect(result).toHaveLength(1);
      expect(result[0].teamId).toBe(2);
    });
  });

  describe("isUserOrgAdminOrOwnerOfAnotherUser", () => {
    it("should return false when user is not admin/owner of any org", async () => {
      (membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner as jest.Mock).mockResolvedValue([]);

      const result = await service.isUserOrgAdminOrOwnerOfAnotherUser(1, 2);
      expect(result).toBe(false);
      expect(membershipsRepository.getUserMembershipInOneOfOrgs).not.toHaveBeenCalled();
    });

    it("should return true when another user is in same org", async () => {
      (membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner as jest.Mock).mockResolvedValue([10]);
      (membershipsRepository.getUserMembershipInOneOfOrgs as jest.Mock).mockResolvedValue({
        teamId: 10,
        userId: 2,
      });

      const result = await service.isUserOrgAdminOrOwnerOfAnotherUser(1, 2);
      expect(result).toBe(true);
    });

    it("should return true when another user is in org team", async () => {
      (membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner as jest.Mock).mockResolvedValue([10]);
      (membershipsRepository.getUserMembershipInOneOfOrgs as jest.Mock).mockResolvedValue(null);
      (membershipsRepository.getUserMembershipInOneOfOrgsTeams as jest.Mock).mockResolvedValue({
        teamId: 20,
        userId: 2,
      });

      const result = await service.isUserOrgAdminOrOwnerOfAnotherUser(1, 2);
      expect(result).toBe(true);
    });

    it("should return false when another user is not in any org or team", async () => {
      (membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner as jest.Mock).mockResolvedValue([10]);
      (membershipsRepository.getUserMembershipInOneOfOrgs as jest.Mock).mockResolvedValue(null);
      (membershipsRepository.getUserMembershipInOneOfOrgsTeams as jest.Mock).mockResolvedValue(null);

      const result = await service.isUserOrgAdminOrOwnerOfAnotherUser(1, 2);
      expect(result).toBe(false);
    });
  });
});
