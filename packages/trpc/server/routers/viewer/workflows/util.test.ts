import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

import { isAuthorized } from "./util";

vi.mock("@calcom/features/pbac/services/permission-check.service");

describe("isAuthorized", () => {
  const mockPermissionCheckService = vi.mocked(PermissionCheckService);
  let mockCheckPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermission = vi.fn();
    mockPermissionCheckService.mockImplementation(
      () =>
        ({
          checkPermission: mockCheckPermission,
        } as any)
    );
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

    it("should ignore isWriteOperation parameter for personal workflows", async () => {
      const workflow = {
        id: 1,
        teamId: null,
        userId: 123,
      };

      const readResult = await isAuthorized(workflow, 123, false);
      const writeResult = await isAuthorized(workflow, 123, true);

      expect(readResult).toBe(true);
      expect(writeResult).toBe(true);
      expect(mockPermissionCheckService).not.toHaveBeenCalled();
    });
  });

  describe("team workflows with PBAC", () => {
    describe("read operations (default)", () => {
      it("should use workflow.read permission with all roles as fallback", async () => {
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
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
        });
      });

      it("should use workflow.read permission when isWriteOperation is explicitly false", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, false);

        expect(result).toBe(true);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.read",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
        });
      });

      it("should return false when PBAC denies read permission", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(false);

        const result = await isAuthorized(workflow, 123, false);

        expect(result).toBe(false);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.read",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
        });
      });
    });

    describe("write operations", () => {
      it("should use workflow.update permission with admin/owner roles as fallback", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(true);

        const result = await isAuthorized(workflow, 123, true);

        expect(result).toBe(true);
        expect(mockPermissionCheckService).toHaveBeenCalledTimes(1);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.update",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        });
      });

      it("should return false when PBAC denies write permission", async () => {
        const workflow = {
          id: 1,
          teamId: 456,
          userId: 123,
        };

        mockCheckPermission.mockResolvedValue(false);

        const result = await isAuthorized(workflow, 123, true);

        expect(result).toBe(false);
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 123,
          teamId: 456,
          permission: "workflow.update",
          fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        });
      });
    });
  });
});
