import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.repository";
import { OrganizationsTeamsMembershipsService } from "@/modules/organizations/teams/memberships/services/organizations-teams-memberships.service";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

// Mock the module with inline implementation
jest.mock("@calcom/platform-libraries", () => ({
  TeamService: {
    removeMembers: jest.fn(),
  },
}));

// Get the mocked functions
import { TeamService } from "@calcom/platform-libraries";
const mockRemoveMembers = TeamService.removeMembers as jest.MockedFunction<
  typeof TeamService.removeMembers
>;

describe("OrganizationsTeamsMembershipsService", () => {
  let service: OrganizationsTeamsMembershipsService;
  let repository: OrganizationsTeamsMembershipsRepository;

  const mockTeamMembership = {
    id: 1,
    userId: 123,
    teamId: 789,
    role: "MEMBER",
    accepted: true,
    user: { id: 123, email: "test@example.com" },
    team: { id: 789, name: "Test Team", parentId: 456 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsTeamsMembershipsService,
        {
          provide: OrganizationsTeamsMembershipsRepository,
          useValue: {
            createOrgTeamMembership: jest.fn(),
            findOrgTeamMembershipsPaginated: jest.fn(),
            findOrgTeamMembership: jest.fn(),
            updateOrgTeamMembershipById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsTeamsMembershipsService>(OrganizationsTeamsMembershipsService);
    repository = module.get<OrganizationsTeamsMembershipsRepository>(OrganizationsTeamsMembershipsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRemoveMembers.mockReset();
  });

  describe("deleteOrgTeamMembership", () => {
    it("should call TeamService.removeMembers with correct parameters when membership exists", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 1;

      jest.spyOn(repository, "findOrgTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.deleteOrgTeamMembership(organizationId, teamId, membershipId);

      expect(repository.findOrgTeamMembership).toHaveBeenCalledWith(organizationId, teamId, membershipId);
      expect(mockRemoveMembers).toHaveBeenCalledWith({
        teamIds: [teamId],
        userIds: [mockTeamMembership.userId],
        isOrg: false,
      });
      expect(result).toEqual(mockTeamMembership);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 999;

      jest.spyOn(repository, "findOrgTeamMembership").mockResolvedValue(null);

      await expect(service.deleteOrgTeamMembership(organizationId, teamId, membershipId)).rejects.toThrow(
        new NotFoundException(
          `Membership with id ${membershipId} not found in team ${teamId} of organization ${organizationId}`
        )
      );

      expect(repository.findOrgTeamMembership).toHaveBeenCalledWith(organizationId, teamId, membershipId);
      expect(mockRemoveMembers).not.toHaveBeenCalled();
    });

    it("should propagate errors from TeamService.removeMembers", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 1;
      const error = new Error("TeamService error");

      jest.spyOn(repository, "findOrgTeamMembership").mockResolvedValue(mockTeamMembership as any);
      mockRemoveMembers.mockRejectedValue(error);

      await expect(service.deleteOrgTeamMembership(organizationId, teamId, membershipId)).rejects.toThrow(
        error
      );

      expect(repository.findOrgTeamMembership).toHaveBeenCalledWith(organizationId, teamId, membershipId);
      expect(mockRemoveMembers).toHaveBeenCalledWith({
        teamIds: [teamId],
        userIds: [mockTeamMembership.userId],
        isOrg: false,
      });
    });
  });

  describe("getOrgTeamMembership", () => {
    it("should return membership when it exists", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 1;

      jest.spyOn(repository, "findOrgTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.getOrgTeamMembership(organizationId, teamId, membershipId);

      expect(result).toEqual(mockTeamMembership);
      expect(repository.findOrgTeamMembership).toHaveBeenCalledWith(organizationId, teamId, membershipId);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 999;

      jest.spyOn(repository, "findOrgTeamMembership").mockResolvedValue(null);

      await expect(service.getOrgTeamMembership(organizationId, teamId, membershipId)).rejects.toThrow(
        new NotFoundException("Organization's Team membership not found")
      );
    });
  });

  describe("getPaginatedOrgTeamMemberships", () => {
    it("should return paginated memberships", async () => {
      const organizationId = 456;
      const teamId = 789;
      const skip = 0;
      const take = 10;
      const mockMemberships = [mockTeamMembership];

      jest.spyOn(repository, "findOrgTeamMembershipsPaginated").mockResolvedValue(mockMemberships as any);

      const result = await service.getPaginatedOrgTeamMemberships(organizationId, teamId, skip, take);

      expect(result).toEqual(mockMemberships);
      expect(repository.findOrgTeamMembershipsPaginated).toHaveBeenCalledWith(
        organizationId,
        teamId,
        skip,
        take
      );
    });
  });

  describe("createOrgTeamMembership", () => {
    it("should create membership", async () => {
      const teamId = 789;
      const createDto = { userId: 123, role: "MEMBER" as const };

      jest.spyOn(repository, "createOrgTeamMembership").mockResolvedValue(mockTeamMembership as any);

      const result = await service.createOrgTeamMembership(teamId, createDto);

      expect(result).toEqual(mockTeamMembership);
      expect(repository.createOrgTeamMembership).toHaveBeenCalledWith(teamId, createDto);
    });
  });

  describe("updateOrgTeamMembership", () => {
    it("should update membership", async () => {
      const organizationId = 456;
      const teamId = 789;
      const membershipId = 1;
      const updateDto = { role: "ADMIN" as const };

      jest.spyOn(repository, "updateOrgTeamMembershipById").mockResolvedValue({
        ...mockTeamMembership,
        role: "ADMIN",
      } as any);

      const result = await service.updateOrgTeamMembership(organizationId, teamId, membershipId, updateDto);

      expect(result.role).toBe("ADMIN");
      expect(repository.updateOrgTeamMembershipById).toHaveBeenCalledWith(
        organizationId,
        teamId,
        membershipId,
        updateDto
      );
    });
  });
});
