import { vi, describe, it, expect, beforeEach } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { DEFAULT_ROLE_IDS } from "../../lib/constants";
import { PermissionCheckService } from "../permission-check.service";
import { RoleManagementFactory } from "../role-management.factory";
import { RoleService } from "../role.service";

// Mock dependencies
vi.mock("@calcom/features/flags/features.repository");
vi.mock("../role.service");
vi.mock("../permission-check.service");
vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      update: vi.fn(),
    },
  },
}));
vi.mock("@calcom/lib/server/queries/organisations", () => ({
  isOrganisationAdmin: vi.fn(),
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
        await expect(manager.checkPermissionToChangeRole(userId, organizationId)).resolves.not.toThrow();
      });

      it("should throw UNAUTHORIZED when user lacks permission", async () => {
        mockPermissionCheckService.checkPermission.mockResolvedValue(false);
        const manager = await factory.createRoleManager(organizationId);
        await expect(manager.checkPermissionToChangeRole(userId, organizationId)).rejects.toThrow(TRPCError);
      });
    });

    describe("assignRole", () => {
      it("should assign default role correctly", async () => {
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
        mockRoleService.roleBelongsToTeam.mockResolvedValue(true);
        mockRoleService.assignRoleToMember.mockResolvedValue(undefined);

        const manager = await factory.createRoleManager(organizationId);
        await manager.assignRole(userId, organizationId, customRoleId as MembershipRole, membershipId);

        expect(mockRoleService.roleBelongsToTeam).toHaveBeenCalledWith(customRoleId, organizationId);
        expect(mockRoleService.assignRoleToMember).toHaveBeenCalledWith(customRoleId, membershipId);
      });

      it("should throw UNAUTHORIZED for invalid custom role", async () => {
        const customRoleId = "invalid-role";
        mockRoleService.roleBelongsToTeam.mockResolvedValue(false);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, customRoleId as MembershipRole, membershipId)
        ).rejects.toThrow(TRPCError);
      });
    });
  });

  describe("LegacyRoleManager", () => {
    beforeEach(() => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      vi.mocked(prisma.membership.update).mockResolvedValue({});
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
    });

    describe("checkPermissionToChangeRole", () => {
      it("should allow role change when user is owner", async () => {
        vi.mocked(isOrganisationAdmin).mockResolvedValue(true);
        const manager = await factory.createRoleManager(organizationId);
        await expect(manager.checkPermissionToChangeRole(userId, organizationId)).resolves.not.toThrow();
      });

      it("should throw UNAUTHORIZED when user is not owner", async () => {
        vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
        const manager = await factory.createRoleManager(organizationId);
        await expect(manager.checkPermissionToChangeRole(userId, organizationId)).rejects.toThrow(TRPCError);
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
