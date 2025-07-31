import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { TeamService } from "@calcom/platform-libraries";

jest.mock("@calcom/platform-libraries", () => ({
  TeamService: {
    removeMembers: jest.fn(),
  },
}));

describe("TeamsMembershipsService", () => {
  let service: TeamsMembershipsService;
  let repository: TeamsMembershipsRepository;

  const mockTeamMembership = {
    id: 1,
    userId: 123,
    teamId: 789,
    role: "MEMBER",
    accepted: true,
    user: { id: 123, email: "test@example.com" },
    team: { id: 789, name: "Test Team" },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsMembershipsService,
        {
          provide: TeamsMembershipsRepository,
          useValue: {
            createTeamMembership: jest.fn(),
            findTeamMembershipsPaginated: jest.fn(),
            findTeamMembership: jest.fn(),
            updateTeamMembershipById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeamsMembershipsService>(TeamsMembershipsService);
    repository = module.get<TeamsMembershipsRepository>(TeamsMembershipsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteTeamMembership", () => {
    it("should call TeamService.removeMembers with correct parameters when membership exists", async () => {
      const teamId = 789;
      const membershipId = 1;

      jest.spyOn(repository, "findTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.deleteTeamMembership(teamId, membershipId);

      expect(repository.findTeamMembership).toHaveBeenCalledWith(teamId, membershipId);
      expect(TeamService.removeMembers).toHaveBeenCalledWith({
        teamIds: [teamId],
        userIds: [mockTeamMembership.userId],
        isOrg: false,
      });
      expect(result).toEqual(mockTeamMembership);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const teamId = 789;
      const membershipId = 999;

      jest.spyOn(repository, "findTeamMembership").mockResolvedValue(null);

      await expect(service.deleteTeamMembership(teamId, membershipId)).rejects.toThrow(
        new NotFoundException(`Membership with id ${membershipId} not found in team ${teamId}`)
      );

      expect(repository.findTeamMembership).toHaveBeenCalledWith(teamId, membershipId);
      expect(TeamService.removeMembers).not.toHaveBeenCalled();
    });

    it("should propagate errors from TeamService.removeMembers", async () => {
      const teamId = 789;
      const membershipId = 1;
      const error = new Error("TeamService error");

      jest.spyOn(repository, "findTeamMembership").mockResolvedValue(mockTeamMembership as any);
      jest.spyOn(TeamService, "removeMembers").mockRejectedValue(error);

      await expect(service.deleteTeamMembership(teamId, membershipId)).rejects.toThrow(error);

      expect(repository.findTeamMembership).toHaveBeenCalledWith(teamId, membershipId);
      expect(TeamService.removeMembers).toHaveBeenCalledWith({
        teamIds: [teamId],
        userIds: [mockTeamMembership.userId],
        isOrg: false,
      });
    });
  });

  describe("getTeamMembership", () => {
    it("should return membership when it exists", async () => {
      const teamId = 789;
      const membershipId = 1;

      jest.spyOn(repository, "findTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.getTeamMembership(teamId, membershipId);

      expect(result).toEqual(mockTeamMembership);
      expect(repository.findTeamMembership).toHaveBeenCalledWith(teamId, membershipId);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const teamId = 789;
      const membershipId = 999;

      jest.spyOn(repository, "findTeamMembership").mockResolvedValue(null);

      await expect(service.getTeamMembership(teamId, membershipId)).rejects.toThrow(
        new NotFoundException("Organization's Team membership not found")
      );
    });
  });

  describe("getPaginatedTeamMemberships", () => {
    it("should return paginated memberships", async () => {
      const teamId = 789;
      const skip = 0;
      const take = 10;
      const mockMemberships = [mockTeamMembership];

      jest.spyOn(repository, "findTeamMembershipsPaginated").mockResolvedValue(mockMemberships as any);

      const result = await service.getPaginatedTeamMemberships(teamId, skip, take);

      expect(result).toEqual(mockMemberships);
      expect(repository.findTeamMembershipsPaginated).toHaveBeenCalledWith(teamId, skip, take);
    });
  });

  describe("createTeamMembership", () => {
    it("should create membership", async () => {
      const teamId = 789;
      const createDto = { userId: 123, role: "MEMBER" as const };

      jest.spyOn(repository, "createTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.createTeamMembership(teamId, createDto);

      expect(result).toEqual(mockTeamMembership);
      expect(repository.createTeamMembership).toHaveBeenCalledWith(teamId, createDto);
    });
  });

  describe("updateTeamMembership", () => {
    it("should update membership", async () => {
      const teamId = 789;
      const membershipId = 1;
      const updateDto = { role: "ADMIN" as const };

      jest.spyOn(repository, "updateTeamMembershipById").mockResolvedValue({
        ...mockTeamMembership,
        role: "ADMIN",
      } as any);

      const result = await service.updateTeamMembership(teamId, membershipId, updateDto);

      expect(result.role).toBe("ADMIN");
      expect(repository.updateTeamMembershipById).toHaveBeenCalledWith(teamId, membershipId, updateDto);
    });
  });
});
