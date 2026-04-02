import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/pbac/services/permission-check.service");

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

describe("isAuthorized", () => {
  const mockPermissionCheckService = vi.mocked(PermissionCheckService);
  let mockCheckPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermission = vi.fn();
    mockPermissionCheckService.mockImplementation(function () {
      return {
        checkPermission: mockCheckPermission,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });
  });

  describe("null workflow", () => {
    it("should return false when workflow is null", async () => {
      const result = await isAuthorized(null, 123);
      expect(result).toBe(false);
    });
  });

  describe("personal workflows (no teamId)", () => {
    it("should return true when user owns the personal workflow", async () => {
      const workflow = {
        id: 1,
        teamId: null,
        userId: 123,
      };

      const result = await isAuthorized(workflow, 123);
      expect(result).toBe(true);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });

    it("should return false when user does not own the personal workflow", async () => {
      const workflow = {
        id: 1,
        teamId: null,
        userId: 456,
      };

      const result = await isAuthorized(workflow, 123);
      expect(result).toBe(false);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });

    it("should ignore permission parameter for personal workflows", async () => {
      const workflow = {
        id: 1,
        teamId: null,
        userId: 123,
      };

      const readResult = await isAuthorized(workflow, 123, "workflow.read");
      const updateResult = await isAuthorized(workflow, 123, "workflow.update");
      const deleteResult = await isAuthorized(workflow, 123, "workflow.delete");

      expect(readResult).toBe(true);
      expect(updateResult).toBe(true);
      expect(deleteResult).toBe(true);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });
  });

  describe("team workflows with PBAC", () => {
    describe("read operations", () => {
      it("should use workflow.read permission by default with all roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123);

        expect(result).toBe(true);
        expect(mockPermissionCheckService).toHaveBeenCalledTimes(1);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.read",
          fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
        });
      });

      it("should use workflow.read permission when explicitly passed", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, "workflow.read");

        expect(result).toBe(true);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.read",
          fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
        });
      });

      it("should return false when PBAC denies read permission", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(false);

        const result = await isAuthorized(workflow, 123, "workflow.read");

        expect(result).toBe(false);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.read",
          fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
        });
      });
    });

    describe("update operations", () => {
      it("should use workflow.update permission with admin/owner roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, "workflow.update");

        expect(result).toBe(true);
        expect(mockPermissionCheckService).toHaveBeenCalledTimes(1);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.update",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should return false when PBAC denies update permission", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(false);

        const result = await isAuthorized(workflow, 123, "workflow.update");

        expect(result).toBe(false);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.update",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });
    });

    describe("delete operations", () => {
      it("should use workflow.delete permission with admin/owner roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, "workflow.delete");

        expect(result).toBe(true);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.delete",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should return false when PBAC denies delete permission", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(false);

        const result = await isAuthorized(workflow, 123, "workflow.delete");

        expect(result).toBe(false);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.delete",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });
    });

    describe("other permissions", () => {
      it("should use workflow.create permission with admin/owner roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, "workflow.create");

        expect(result).toBe(true);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.create",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should use workflow.manage permission with admin/owner roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, "workflow.manage");

        expect(result).toBe(true);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.manage",
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });
    });

    describe("permission service integration", () => {
      it("should create a new PermissionCheckService instance for each call", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        await isAuthorized(workflow, 123, "workflow.read");
        await isAuthorized(workflow, 123, "workflow.update");

        expect(mockPermissionCheckService).toHaveBeenCalledTimes(2);
      });

      it("should handle permission service errors gracefully", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockRejectedValue(new Error("Permission service error"));

        await expect(isAuthorized(workflow, 123, "workflow.read")).rejects.toThrow(
          "Permission service error"
        );
      });
    });
  });

  describe("edge cases", () => {
    it("should handle workflow with teamId 0 as personal workflow", async () => {
      const workflow = {
        id: 1,
        teamId: 0,
        userId: 123,
      };

      const result = await isAuthorized(workflow, 123, "workflow.delete");

      expect(result).toBe(true);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });

    it("should handle workflow with positive teamId as team workflow", async () => {
      const workflow = {
        id: 1,
        teamId: 1,
        userId: 123,
      };

      mockCheckPermission.mockResolvedValue(true);

      const result = await isAuthorized(workflow, 123, "workflow.read");

      expect(result).toBe(true);
      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 123,
        teamId: 1,
        permission: "workflow.read",
        fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
      });
    });

    it("should handle different user IDs correctly", async () => {
      const workflow = {
        id: 1,
        teamId: 456,
        userId: 123,
      };

      mockCheckPermission.mockResolvedValue(true);

      const result = await isAuthorized(workflow, 789, "workflow.read");

      expect(result).toBe(true);
      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 789,
        teamId: 456,
        permission: "workflow.read",
        fallbackRoles: ["ADMIN", "OWNER", "MEMBER"],
      });
    });

    it("should handle workflow with undefined teamId as personal workflow", async () => {
      const workflow = {
        id: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teamId: undefined as any,
        userId: 123,
      };

      const result = await isAuthorized(workflow, 123, "workflow.delete");

      expect(result).toBe(true);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });
  });

  describe("type safety", () => {
    it("should work with minimal workflow object", async () => {
      const workflow = {
        id: 1,
        teamId: null,
        userId: 123,
      };

      const result = await isAuthorized(workflow, 123, "workflow.read");
      expect(result).toBe(true);
    });

    it("should work with workflow object containing extra properties", async () => {
      const workflow = {
        id: 1,
        teamId: 456,
        userId: 123,
        name: "Test Workflow",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCheckPermission.mockResolvedValue(true);

      const result = await isAuthorized(workflow, 123, "workflow.update");
      expect(result).toBe(true);
    });
  });
});
