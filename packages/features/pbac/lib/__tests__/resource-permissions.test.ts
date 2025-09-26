import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { vi, type Mock, describe, it, expect, beforeEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { PermissionMapper } from "../../domain/mappers/PermissionMapper";
import { Resource, CrudAction } from "../../domain/types/permission-registry";
import { PermissionCheckService } from "../../services/permission-check.service";
import { getResourcePermissions } from "../resource-permissions";

vi.mock("../../services/permission-check.service");
vi.mock("../../domain/mappers/PermissionMapper", () => ({
  PermissionMapper: {
    toActionMap: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

describe("getResourcePermissions", () => {
  let mockPermissionCheckService: {
    getResourcePermissions: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPermissionCheckService = {
      getResourcePermissions: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
  });

  describe("PBAC permissions", () => {
    it("should get permissions from PermissionCheckService", async () => {
      const mockResourcePermissions = ["team.read", "team.update"];
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue(mockResourcePermissions);

      vi.mocked(PermissionMapper.toActionMap).mockReturnValue({
        [CrudAction.Read]: true,
        [CrudAction.Update]: true,
        [CrudAction.Delete]: false,
        [CrudAction.Create]: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getResourcePermissions({
        userId: 1,
        teamId: 2,
        resource: Resource.Team,
        userRole: MembershipRole.MEMBER,
      });

      expect(mockPermissionCheckService.getResourcePermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 2,
        resource: Resource.Team,
      });

      expect(PermissionMapper.toActionMap).toHaveBeenCalledWith(mockResourcePermissions, Resource.Team);

      expect(result).toEqual({
        canRead: true,
        canEdit: true,
        canDelete: false,
        canCreate: false,
      });
    });

    it("should handle null values from action map", async () => {
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue([]);

      vi.mocked(PermissionMapper.toActionMap).mockReturnValue({
        [CrudAction.Read]: null,
        [CrudAction.Update]: undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getResourcePermissions({
        userId: 1,
        teamId: 2,
        resource: Resource.Organization,
        userRole: MembershipRole.MEMBER,
      });

      expect(result).toEqual({
        canRead: false,
        canEdit: false,
        canDelete: false,
        canCreate: false,
      });
    });

    it("should handle different resources", async () => {
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue([
        "organization.attributes.read",
        "organization.attributes.create",
        "organization.attributes.update",
        "organization.attributes.delete",
      ]);

      vi.mocked(PermissionMapper.toActionMap).mockReturnValue({
        [CrudAction.Read]: true,
        [CrudAction.Create]: true,
        [CrudAction.Update]: true,
        [CrudAction.Delete]: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await getResourcePermissions({
        userId: 1,
        teamId: 2,
        resource: Resource.Attributes,
        userRole: MembershipRole.ADMIN,
      });

      expect(mockPermissionCheckService.getResourcePermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 2,
        resource: Resource.Attributes,
      });

      expect(result).toEqual({
        canRead: true,
        canEdit: true,
        canDelete: true,
        canCreate: true,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle errors from PermissionCheckService", async () => {
      mockPermissionCheckService.getResourcePermissions.mockRejectedValue(
        new Error("Permission service error")
      );

      await expect(
        getResourcePermissions({
          userId: 1,
          teamId: 1,
          resource: Resource.Team,
          userRole: MembershipRole.OWNER,
        })
      ).rejects.toThrow("Permission service error");
    });
  });
});
