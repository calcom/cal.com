import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeMemberHandler } from "../../removeMember.handler";
import type { IRemoveMemberService } from "../IRemoveMemberService";
import { RemoveMemberServiceFactory } from "../RemoveMemberServiceFactory";

vi.mock("@calcom/lib/checkRateLimitAndThrowError");
vi.mock("../RemoveMemberServiceFactory");

describe("removeMemberHandler", () => {
  const mockService: IRemoveMemberService = {
    checkRemovePermissions: vi.fn(),
    validateRemoval: vi.fn(),
    removeMembers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimitAndThrowError).mockResolvedValue({
      success: true,
      remaining: 99,
      limit: 100,
      reset: Date.now() + 60 * 1000,
    });
    vi.mocked(RemoveMemberServiceFactory.create).mockResolvedValue(mockService);
    vi.mocked(mockService.checkRemovePermissions).mockResolvedValue({
      hasPermission: true,
      userRoles: new Map(),
    });
  });

  describe("Rate Limiting", () => {
    it("should check rate limit before processing", async () => {
      const userId = 1;
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: false,
      };

      await removeMemberHandler({
        ctx: { user: { id: userId, organizationId: null } },
        input,
      });

      expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
        identifier: `removeMember.${userId}`,
      });
    });
  });

  describe("Input Validation", () => {
    it("should throw BAD_REQUEST when no team IDs provided", async () => {
      const input = {
        teamIds: [],
        memberIds: [2],
        isOrg: false,
      };

      await expect(
        removeMemberHandler({
          ctx: { user: { id: 1, organizationId: null } },
          input,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
          message: "At least one team ID must be provided",
        })
      );
    });
  });

  describe("Service Factory Integration", () => {
    it("should create service using primary team ID", async () => {
      const primaryTeamId = 1;
      const input = {
        teamIds: [primaryTeamId, 2, 3],
        memberIds: [4, 5],
        isOrg: false,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: true });

      await removeMemberHandler({
        ctx: { user: { id: 1, organizationId: null } },
        input,
      });

      expect(RemoveMemberServiceFactory.create).toHaveBeenCalledWith(primaryTeamId);
    });
  });

  describe("Permission Checking", () => {
    it("should pass org admin status to permission check", async () => {
      const userId = 1;
      const isOrgAdmin = true;
      const organizationId = 10;
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: true,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: true });

      await removeMemberHandler({
        ctx: {
          user: {
            id: userId,
            organizationId,
            organization: { id: organizationId, isOrgAdmin },
          },
        },
        input,
      });

      expect(mockService.checkRemovePermissions).toHaveBeenCalledWith({
        userId,
        isOrgAdmin,
        organizationId,
        memberIds: input.memberIds,
        teamIds: input.teamIds,
        isOrg: input.isOrg,
      });
    });

    it("should default isOrgAdmin to false when not provided", async () => {
      const userId = 1;
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: false,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: true });

      await removeMemberHandler({
        ctx: { user: { id: userId, organizationId: null } },
        input,
      });

      expect(mockService.checkRemovePermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          isOrgAdmin: false,
          organizationId: null,
        })
      );
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: false,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: false });

      await expect(
        removeMemberHandler({
          ctx: { user: { id: 1, organizationId: null } },
          input,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
        })
      );

      expect(mockService.validateRemoval).not.toHaveBeenCalled();
      expect(mockService.removeMembers).not.toHaveBeenCalled();
    });
  });

  describe("Removal Flow", () => {
    it("should complete full removal flow when user has permission", async () => {
      const userId = 1;
      const isOrgAdmin = false;
      const organizationId = null;
      const input = {
        teamIds: [1, 2],
        memberIds: [3, 4],
        isOrg: false,
      };

      const hasPermissionResult = {
        hasPermission: true,
        userRoles: new Map([
          [1, "ADMIN"],
          [2, "OWNER"],
        ]),
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue(hasPermissionResult);
      mockService.validateRemoval = vi.fn().mockResolvedValue(undefined);
      mockService.removeMembers = vi.fn().mockResolvedValue(undefined);

      await removeMemberHandler({
        ctx: { user: { id: userId, organizationId } },
        input,
      });

      // Verify service calls in order
      expect(mockService.checkRemovePermissions).toHaveBeenCalledWith({
        userId,
        isOrgAdmin,
        organizationId,
        memberIds: input.memberIds,
        teamIds: input.teamIds,
        isOrg: input.isOrg,
      });

      expect(mockService.validateRemoval).toHaveBeenCalledWith(
        {
          userId,
          isOrgAdmin,
          organizationId,
          memberIds: input.memberIds,
          teamIds: input.teamIds,
          isOrg: input.isOrg,
        },
        hasPermissionResult.hasPermission
      );

      expect(mockService.removeMembers).toHaveBeenCalledWith(input.memberIds, input.teamIds, input.isOrg);
    });

    it("should handle org admin removing members from teams within their organization", async () => {
      const userId = 1;
      const isOrgAdmin = true;
      const organizationId = 50;
      const input = {
        teamIds: [100, 200], // Teams within the org admin's organization
        memberIds: [3, 4],
        isOrg: true,
      };

      const hasPermissionResult = { hasPermission: true };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue(hasPermissionResult);
      mockService.validateRemoval = vi.fn().mockResolvedValue(undefined);
      mockService.removeMembers = vi.fn().mockResolvedValue(undefined);

      await removeMemberHandler({
        ctx: {
          user: {
            id: userId,
            organizationId,
            organization: { id: organizationId, isOrgAdmin },
          },
        },
        input,
      });

      expect(mockService.checkRemovePermissions).toHaveBeenCalledWith({
        userId,
        isOrgAdmin: true,
        organizationId,
        memberIds: input.memberIds,
        teamIds: input.teamIds,
        isOrg: input.isOrg,
      });

      expect(mockService.removeMembers).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should propagate validation errors", async () => {
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: false,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: true });
      mockService.validateRemoval = vi
        .fn()
        .mockRejectedValue(new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove owner" }));

      await expect(
        removeMemberHandler({
          ctx: { user: { id: 1, organizationId: null } },
          input,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
          message: "Cannot remove owner",
        })
      );
    });

    it("should propagate service removal errors", async () => {
      const input = {
        teamIds: [1],
        memberIds: [2],
        isOrg: false,
      };

      mockService.checkRemovePermissions = vi.fn().mockResolvedValue({ hasPermission: true });
      mockService.validateRemoval = vi.fn().mockResolvedValue(undefined);
      mockService.removeMembers = vi.fn().mockRejectedValue(new Error("Database error"));

      await expect(
        removeMemberHandler({
          ctx: { user: { id: 1, organizationId: null } },
          input,
        })
      ).rejects.toThrow("Database error");
    });
  });
});
