import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isOrganisationAdmin, isOrganisationOwner } from "@calcom/features/pbac/utils/isOrganisationAdmin";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleManagementError, RoleManagementErrorCode } from "../../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../../lib/constants";
import { PermissionCheckService } from "../permission-check.service";
import { RoleService } from "../role.service";
import { RoleManagementFactory } from "../role-management.factory";

// Mock dependencies
vi.mock("@calcom/features/flags/features.repository");
vi.mock("../role.service");
vi.mock("../permission-check.service");
vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@calcom/features/pbac/utils/isOrganisationAdmin", () => ({
  isOrganisationAdmin: vi.fn(),
  isOrganisationOwner: vi.fn(),
}));

describe("RoleManagementFactory", () => {
  const organizationId = 123;
  const userId = 456;
  const membershipId = 789;
  const role = MembershipRole.ADMIN;

  let factory: RoleManagementFactory;
  let mockFeaturesRepository: { checkIfTeamHasFeature: ReturnType<typeof vi.fn> };
  let mockRoleService: {
    assignRoleToMember: ReturnType<typeof vi.fn>;
    roleBelongsToTeam: ReturnType<typeof vi.fn>;
  };
  let mockPermissionCheckService: { checkPermission: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup mocks
    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    };

    mockRoleService = {
      assignRoleToMember: vi.fn(),
      roleBelongsToTeam: vi.fn(),
    };

    mockPermissionCheckService = {
      checkPermission: vi.fn(),
    };

    // Reset singleton instance and set up mocks
    Object.defineProperty(RoleManagementFactory, "instance", {
      value: undefined,
      writable: true,
    });

    vi.spyOn(FeaturesRepository.prototype, "checkIfTeamHasFeature").mockImplementation(
      mockFeaturesRepository.checkIfTeamHasFeature
    );
    vi.spyOn(RoleService.prototype, "assignRoleToMember").mockImplementation(
      mockRoleService.assignRoleToMember
    );
    vi.spyOn(RoleService.prototype, "roleBelongsToTeam").mockImplementation(
      mockRoleService.roleBelongsToTeam
    );
    vi.spyOn(PermissionCheckService.prototype, "checkPermission").mockImplementation(
      mockPermissionCheckService.checkPermission
    );

    factory = RoleManagementFactory.getInstance();
  });

  describe("getInstance", () => {
    it("should create a singleton instance", () => {
      const instance1 = RoleManagementFactory.getInstance();
      const instance2 = RoleManagementFactory.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("createRoleManager", () => {
    it("should create PBACRoleManager when PBAC is enabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
      const manager = await factory.createRoleManager(organizationId);
      expect(manager.constructor.name).toBe("PBACRoleManager");
    });

    it("should create LegacyRoleManager when PBAC is disabled", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      const manager = await factory.createRoleManager(organizationId);
      expect(manager.constructor.name).toBe("LegacyRoleManager");
    });
  });

  describe("PBACRoleManager", () => {
    beforeEach(() => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
    });

    describe("checkPermissionToChangeRole", () => {
      it("should allow role change when user has permission", async () => {
        mockPermissionCheckService.checkPermission.mockResolvedValue(true);
        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.checkPermissionToChangeRole(userId, organizationId, "org")
        ).resolves.not.toThrow();
      });

      it("should throw UNAUTHORIZED when user lacks permission", async () => {
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);
        const manager = await factory.createRoleManager(organizationId);
        await expect(manager.checkPermissionToChangeRole(userId, organizationId, "org")).rejects.toThrow(
          new RoleManagementError(
            "You do not have permission to change roles",
            RoleManagementErrorCode.UNAUTHORIZED
          )
        );
      });
    });

    describe("assignRole", () => {
      it("should assign default role correctly", async () => {
        // Mock non-owner membership to bypass owner validation
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: null,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);
        const manager = await factory.createRoleManager(organizationId);
        await manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId);
        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(
          DEFAULT_ROLE_IDS[MembershipRole.ADMIN],
          membershipId
        );
      });

      it("should assign custom role after validation", async () => {
        const customRoleId = "custom-role-123";

        // Mock non-owner membership to bypass owner validation
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: null,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockRoleService.roleBelongsToTeam.mockResolvedValue(true);
        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);

        const manager = await factory.createRoleManager(organizationId);
        await manager.assignRole(userId, organizationId, customRoleId as MembershipRole, membershipId);

        expect(mockRoleService.roleBelongsToTeam).toHaveBeenCalledWith(customRoleId, organizationId);
        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(customRoleId, membershipId);
      });

      it("should throw INVALID_ROLE for invalid custom role", async () => {
        const customRoleId = "invalid-role";
        mockRoleService.roleBelongsToTeam.mockResolvedValue(false);

        // Mock non-owner membership to bypass owner validation
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: null,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, customRoleId as MembershipRole, membershipId)
        ).rejects.toThrow(
          new RoleManagementError("You do not have access to this role", RoleManagementErrorCode.INVALID_ROLE)
        );
      });

      it("should prevent changing the last owner to non-owner role", async () => {
        // Mock current membership as owner with customRoleId
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: DEFAULT_ROLE_IDS[MembershipRole.OWNER],
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock count showing only 1 owner
        vi.mocked(prisma.membership.count).mockResolvedValue(1);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId)
        ).rejects.toThrow(
          new RoleManagementError(
            "Cannot change the role of the last owner in the organization",
            RoleManagementErrorCode.UNAUTHORIZED
          )
        );
      });

      it("should prevent changing the last legacy owner to non-owner role", async () => {
        // Mock current membership as legacy owner (role field)
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.OWNER,
          customRoleId: null,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock count showing only 1 owner
        vi.mocked(prisma.membership.count).mockResolvedValue(1);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId)
        ).rejects.toThrow(
          new RoleManagementError(
            "Cannot change the role of the last owner in the organization",
            RoleManagementErrorCode.UNAUTHORIZED
          )
        );
      });

      it("should allow changing owner role when multiple owners exist", async () => {
        // Mock current membership as owner
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: DEFAULT_ROLE_IDS[MembershipRole.OWNER],
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock count showing multiple owners
        vi.mocked(prisma.membership.count).mockResolvedValue(2);
        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId)
        ).resolves.not.toThrow();

        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(
          DEFAULT_ROLE_IDS[MembershipRole.ADMIN],
          membershipId
        );
      });

      it("should allow changing owner to owner (same role)", async () => {
        // Mock current membership as owner
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: DEFAULT_ROLE_IDS[MembershipRole.OWNER],
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock count showing only 1 owner (should be bypassed)
        vi.mocked(prisma.membership.count).mockResolvedValue(1);
        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.OWNER, membershipId)
        ).resolves.not.toThrow();

        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(
          DEFAULT_ROLE_IDS[MembershipRole.OWNER],
          membershipId
        );
      });

      it("should allow changing non-owner role without validation", async () => {
        // Mock current membership as non-owner
        vi.mocked(prisma.membership.findUnique).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.MEMBER,
          customRoleId: null,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId)
        ).resolves.not.toThrow();

        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(
          DEFAULT_ROLE_IDS[MembershipRole.ADMIN],
          membershipId
        );
        // Should not call count since it's not an owner
        expect(prisma.membership.count).not.toHaveBeenCalled();
      });

      it("should throw error when membership is not found", async () => {
        // Mock membership not found
        vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, MembershipRole.ADMIN, membershipId)
        ).rejects.toThrow(
          new RoleManagementError("Membership not found", RoleManagementErrorCode.UNAUTHORIZED)
        );
      });
    });
  });

  describe("LegacyRoleManager", () => {
    beforeEach(() => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      vi.mocked(prisma.membership.update).mockResolvedValue({
        id: 1,
        teamId: organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: MembershipRole.MEMBER,
        userId: userId,
        disableImpersonation: false,
        accepted: true,
        customRoleId: null,
      });
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
    });

    describe("checkPermissionToChangeRole", () => {
      it("should allow role change when user is owner", async () => {
        vi.mocked(isOrganisationAdmin).mockResolvedValue({
          id: 1,
          teamId: organizationId,
          userId: userId,
          role: MembershipRole.OWNER,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          customRoleId: null,
        });
        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.checkPermissionToChangeRole(userId, organizationId, "org")
        ).resolves.not.toThrow();
      });

      it("should throw UNAUTHORIZED when user is not owner", async () => {
        vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
        const manager = await factory.createRoleManager(organizationId);
        await expect(manager.checkPermissionToChangeRole(userId, organizationId, "org")).rejects.toThrow(
          new RoleManagementError(
            "Only owners or admin can update roles",
            RoleManagementErrorCode.UNAUTHORIZED
          )
        );
      });

      it("should prevent changing admin to owner", async () => {
        vi.mocked(isOrganisationAdmin).mockResolvedValue({
          id: membershipId,
          userId,
          teamId: organizationId,
          role: MembershipRole.ADMIN,
          accepted: true,
          disableImpersonation: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          customRoleId: null,
        });
        vi.mocked(isOrganisationOwner).mockResolvedValue(false);
        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.checkPermissionToChangeRole(
            userId,
            organizationId,
            "org",
            membershipId,
            MembershipRole.OWNER
          )
        ).rejects.toThrow(
          new RoleManagementError("Only owners can update this role", RoleManagementErrorCode.UNAUTHORIZED)
        );
      });
    });

    describe("assignRole", () => {
      it("should update membership role in database", async () => {
        const manager = await factory.createRoleManager(organizationId);
        await manager.assignRole(userId, organizationId, role, membershipId);

        expect(prisma.membership.update).toHaveBeenCalledWith({
          where: {
            userId_teamId: {
              userId,
              teamId: organizationId,
            },
          },
          data: {
            role,
          },
        });
      });
    });
  });
});
