import { vi, describe, it, expect, beforeEach } from "vitest";

import { RoleManagementError, RoleManagementErrorCode } from "../../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../../lib/constants";
import { PermissionCheckService } from "../permission-check.service";
import { RoleManagementFactory } from "../role-management.factory";
import { RoleService } from "../role.service";

// Mock dependencies
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

  let factory: RoleManagementFactory;
  let mockRoleService: {
    assignRoleToMember: ReturnType<typeof vi.fn>;
    roleBelongsToTeam: ReturnType<typeof vi.fn>;
  };
  let mockPermissionCheckService: { checkPermission: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup mocks
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
    it("should always create PBACRoleManager", async () => {
      const manager = await factory.createRoleManager(organizationId);
      expect(manager.constructor.name).toBe("PBACRoleManager");
    });
  });

  describe("PBACRoleManager", () => {
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

      it("should throw INVALID_ROLE for invalid custom role", async () => {
        const customRoleId = "invalid-role";
        mockRoleService.roleBelongsToTeam.mockResolvedValue(false);

        const manager = await factory.createRoleManager(organizationId);
        await expect(
          manager.assignRole(userId, organizationId, customRoleId as MembershipRole, membershipId)
        ).rejects.toThrow(
          new RoleManagementError("You do not have access to this role", RoleManagementErrorCode.INVALID_ROLE)
        );
      });
    });
  });
});
