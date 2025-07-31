import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { TeamService } from "@calcom/platform-libraries";

jest.mock("@calcom/platform-libraries", () => ({
  TeamService: {
    removeMembers: jest.fn(),
  },
}));

describe("OrganizationsMembershipService", () => {
  let service: OrganizationsMembershipService;
  let repository: OrganizationsMembershipRepository;
  let outputService: OrganizationsMembershipOutputService;

  const mockMembership = {
    id: 1,
    userId: 123,
    teamId: 456,
    role: "MEMBER",
    accepted: true,
    user: { id: 123, email: "test@example.com" },
    team: { id: 456, name: "Test Org" },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsMembershipService,
        {
          provide: OrganizationsMembershipRepository,
          useValue: {
            findOrgMembership: jest.fn(),
            findOrgMembershipByUserId: jest.fn(),
            findOrgMembershipsPaginated: jest.fn(),
            updateOrgMembership: jest.fn(),
            createOrgMembership: jest.fn(),
          },
        },
        {
          provide: OrganizationsMembershipOutputService,
          useValue: {
            getOrgMembershipOutput: jest.fn(),
            getOrgMembershipsOutput: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsMembershipService>(OrganizationsMembershipService);
    repository = module.get<OrganizationsMembershipRepository>(OrganizationsMembershipRepository);
    outputService = module.get<OrganizationsMembershipOutputService>(OrganizationsMembershipOutputService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteOrgMembership", () => {
    it("should call TeamService.removeMembers with correct parameters when membership exists", async () => {
      const organizationId = 456;
      const membershipId = 1;

      jest.spyOn(repository, "findOrgMembership").mockResolvedValue(mockMembership as any);
      jest.spyOn(outputService, "getOrgMembershipOutput").mockReturnValue({ id: 1 } as any);

      await service.deleteOrgMembership(organizationId, membershipId);

      expect(repository.findOrgMembership).toHaveBeenCalledWith(organizationId, membershipId);
      expect(TeamService.removeMembers).toHaveBeenCalledWith({
        teamIds: [organizationId],
        userIds: [mockMembership.userId],
        isOrg: true,
      });
      expect(outputService.getOrgMembershipOutput).toHaveBeenCalledWith(mockMembership);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const organizationId = 456;
      const membershipId = 999;

      jest.spyOn(repository, "findOrgMembership").mockResolvedValue(null);

      await expect(service.deleteOrgMembership(organizationId, membershipId)).rejects.toThrow(
        new NotFoundException(
          `Membership with id ${membershipId} within organization id ${organizationId} not found`
        )
      );

      expect(repository.findOrgMembership).toHaveBeenCalledWith(organizationId, membershipId);
      expect(TeamService.removeMembers).not.toHaveBeenCalled();
    });

    it("should propagate errors from TeamService.removeMembers", async () => {
      const organizationId = 456;
      const membershipId = 1;
      const error = new Error("TeamService error");

      jest.spyOn(repository, "findOrgMembership").mockResolvedValue(mockMembership as any);
      jest.spyOn(TeamService, "removeMembers").mockRejectedValue(error);

      await expect(service.deleteOrgMembership(organizationId, membershipId)).rejects.toThrow(error);

      expect(repository.findOrgMembership).toHaveBeenCalledWith(organizationId, membershipId);
      expect(TeamService.removeMembers).toHaveBeenCalledWith({
        teamIds: [organizationId],
        userIds: [mockMembership.userId],
        isOrg: true,
      });
    });
  });

  describe("getOrgMembership", () => {
    it("should return membership when it exists", async () => {
      const organizationId = 456;
      const membershipId = 1;
      const expectedOutput = { id: 1, userId: 123 };

      jest.spyOn(repository, "findOrgMembership").mockResolvedValue(mockMembership as any);
      jest.spyOn(outputService, "getOrgMembershipOutput").mockReturnValue(expectedOutput as any);

      const result = await service.getOrgMembership(organizationId, membershipId);

      expect(result).toEqual(expectedOutput);
      expect(repository.findOrgMembership).toHaveBeenCalledWith(organizationId, membershipId);
      expect(outputService.getOrgMembershipOutput).toHaveBeenCalledWith(mockMembership);
    });

    it("should throw NotFoundException when membership does not exist", async () => {
      const organizationId = 456;
      const membershipId = 999;

      jest.spyOn(repository, "findOrgMembership").mockResolvedValue(null);

      await expect(service.getOrgMembership(organizationId, membershipId)).rejects.toThrow(
        new NotFoundException(
          `Membership with id ${membershipId} within organization id ${organizationId} not found`
        )
      );
    });
  });

  describe("isOrgAdminOrOwner", () => {
    it("should return true for ADMIN role", async () => {
      const organizationId = 456;
      const userId = 123;

      jest.spyOn(repository, "findOrgMembershipByUserId").mockResolvedValue({
        ...mockMembership,
        role: "ADMIN",
      } as any);

      const result = await service.isOrgAdminOrOwner(organizationId, userId);

      expect(result).toBe(true);
      expect(repository.findOrgMembershipByUserId).toHaveBeenCalledWith(organizationId, userId);
    });

    it("should return true for OWNER role", async () => {
      const organizationId = 456;
      const userId = 123;

      jest.spyOn(repository, "findOrgMembershipByUserId").mockResolvedValue({
        ...mockMembership,
        role: "OWNER",
      } as any);

      const result = await service.isOrgAdminOrOwner(organizationId, userId);

      expect(result).toBe(true);
    });

    it("should return false for MEMBER role", async () => {
      const organizationId = 456;
      const userId = 123;

      jest.spyOn(repository, "findOrgMembershipByUserId").mockResolvedValue({
        ...mockMembership,
        role: "MEMBER",
      } as any);

      const result = await service.isOrgAdminOrOwner(organizationId, userId);

      expect(result).toBe(false);
    });

    it("should return false when membership does not exist", async () => {
      const organizationId = 456;
      const userId = 999;

      jest.spyOn(repository, "findOrgMembershipByUserId").mockResolvedValue(null);

      const result = await service.isOrgAdminOrOwner(organizationId, userId);

      expect(result).toBe(false);
    });
  });
});
