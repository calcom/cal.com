import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import type { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "./authedProcedure";
// Import after mocks are set up
import { createTeamPbacProcedure, createOrgPbacProcedure } from "./pbacProcedures";

// Mock dependencies - use factory functions to avoid hoisting issues
const mockCheckPermission = vi.fn();

vi.mock("@calcom/features/pbac/services/permission-check.service", () => {
  return {
    PermissionCheckService: class {
      checkPermission = mockCheckPermission;
    },
  };
});

vi.mock("./authedProcedure", () => ({
  default: {
    input: vi.fn().mockReturnThis(),
    use: vi.fn(),
  },
}));

// Cast the mocked authedProcedure to access mock methods
const mockAuthedProcedure = authedProcedure as unknown as {
  input: ReturnType<typeof vi.fn> & { mockReturnThis: () => void };
  use: ReturnType<typeof vi.fn>;
};

describe("Feature Opt-In PBAC Procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermission.mockReset();
    mockAuthedProcedure.use.mockClear();
    mockAuthedProcedure.input.mockClear();
  });

  describe("createTeamPbacProcedure", () => {
    const testPermission: PermissionString = "team.read";

    it("should create a procedure with input schema for teamId", () => {
      createTeamPbacProcedure(testPermission);

      expect(mockAuthedProcedure.input).toHaveBeenCalled();
      expect(mockAuthedProcedure.use).toHaveBeenCalled();
    });

    describe("middleware behavior", () => {
      const mockCtx = {
        user: {
          id: 1,
        },
      };

      it("should allow access when user has PBAC permission", async () => {
        createTeamPbacProcedure(testPermission);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        mockCheckPermission.mockResolvedValue(true);

        const next = vi.fn().mockResolvedValue("success");
        const result = await middleware({
          ctx: mockCtx,
          input: { teamId: 10 },
          next,
        });

        expect(result).toBe("success");
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 1,
          teamId: 10,
          permission: testPermission,
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should throw FORBIDDEN when user lacks PBAC permission", async () => {
        createTeamPbacProcedure(testPermission);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        mockCheckPermission.mockResolvedValue(false);

        const next = vi.fn();

        await expect(
          middleware({
            ctx: mockCtx,
            input: { teamId: 10 },
            next,
          })
        ).rejects.toThrow(
          new TRPCError({
            code: "FORBIDDEN",
            message: `Permission required: ${testPermission}`,
          })
        );
      });

      it("should use custom fallback roles when provided", async () => {
        const customFallback: MembershipRole[] = ["OWNER"];
        createTeamPbacProcedure(testPermission, customFallback);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        mockCheckPermission.mockResolvedValue(true);

        const next = vi.fn().mockResolvedValue("success");
        await middleware({
          ctx: mockCtx,
          input: { teamId: 10 },
          next,
        });

        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 1,
          teamId: 10,
          permission: testPermission,
          fallbackRoles: customFallback,
        });
      });
    });

    describe("different permission scenarios", () => {
      const permissions: { permission: PermissionString; operation: string }[] = [
        { permission: "team.read", operation: "read" },
        { permission: "team.update", operation: "update" },
      ];

      permissions.forEach(({ permission, operation }) => {
        it(`should use ${permission} for ${operation} operations`, async () => {
          createTeamPbacProcedure(permission);
          const middleware =
            mockAuthedProcedure.use.mock.calls[mockAuthedProcedure.use.mock.calls.length - 1][0];

          mockCheckPermission.mockResolvedValue(true);

          const next = vi.fn().mockResolvedValue("success");
          await middleware({
            ctx: { user: { id: 1 } },
            input: { teamId: 10 },
            next,
          });

          expect(mockCheckPermission).toHaveBeenCalledWith({
            userId: 1,
            teamId: 10,
            permission,
            fallbackRoles: ["ADMIN", "OWNER"],
          });
        });
      });
    });
  });

  describe("createOrgPbacProcedure", () => {
    const testPermission: PermissionString = "organization.read";

    it("should create a procedure with middleware", () => {
      createOrgPbacProcedure(testPermission);

      expect(mockAuthedProcedure.use).toHaveBeenCalled();
    });

    describe("middleware behavior", () => {
      it("should throw BAD_REQUEST when user has no organizationId", async () => {
        createOrgPbacProcedure(testPermission);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        const mockCtx = {
          user: {
            id: 1,
            organizationId: null,
          },
        };

        const next = vi.fn();

        await expect(
          middleware({
            ctx: mockCtx,
            next,
          })
        ).rejects.toThrow(
          new TRPCError({
            code: "BAD_REQUEST",
            message: "You are not a member of any organization.",
          })
        );
      });

      it("should throw FORBIDDEN when user lacks PBAC permission", async () => {
        createOrgPbacProcedure(testPermission);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        const mockCtx = {
          user: {
            id: 1,
            organizationId: 100,
          },
        };

        mockCheckPermission.mockResolvedValue(false);

        const next = vi.fn();

        await expect(
          middleware({
            ctx: mockCtx,
            next,
          })
        ).rejects.toThrow(
          new TRPCError({
            code: "FORBIDDEN",
            message: `Permission required: ${testPermission}`,
          })
        );

        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 1,
          teamId: 100,
          permission: testPermission,
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should allow access and add organizationId to context when user has permission", async () => {
        createOrgPbacProcedure(testPermission);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        const mockCtx = {
          user: {
            id: 1,
            organizationId: 100,
          },
        };

        mockCheckPermission.mockResolvedValue(true);

        const next = vi.fn().mockImplementation(({ ctx }) => {
          // Verify that organizationId is added to context
          expect(ctx.organizationId).toBe(100);
          return "success";
        });

        const result = await middleware({
          ctx: mockCtx,
          next,
        });

        expect(result).toBe("success");
        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 1,
          teamId: 100,
          permission: testPermission,
          fallbackRoles: ["ADMIN", "OWNER"],
        });
      });

      it("should use custom fallback roles when provided", async () => {
        const customFallback: MembershipRole[] = ["OWNER"];
        createOrgPbacProcedure(testPermission, customFallback);
        const middleware = mockAuthedProcedure.use.mock.calls[0][0];

        const mockCtx = {
          user: {
            id: 1,
            organizationId: 100,
          },
        };

        mockCheckPermission.mockResolvedValue(true);

        const next = vi.fn().mockResolvedValue("success");
        await middleware({
          ctx: mockCtx,
          next,
        });

        expect(mockCheckPermission).toHaveBeenCalledWith({
          userId: 1,
          teamId: 100,
          permission: testPermission,
          fallbackRoles: customFallback,
        });
      });
    });

    describe("different permission scenarios", () => {
      const permissions: { permission: PermissionString; operation: string }[] = [
        { permission: "organization.read", operation: "read" },
        { permission: "organization.update", operation: "update" },
      ];

      permissions.forEach(({ permission, operation }) => {
        it(`should use ${permission} for ${operation} operations`, async () => {
          createOrgPbacProcedure(permission);
          const middleware =
            mockAuthedProcedure.use.mock.calls[mockAuthedProcedure.use.mock.calls.length - 1][0];

          const mockCtx = {
            user: {
              id: 1,
              organizationId: 100,
            },
          };

          mockCheckPermission.mockResolvedValue(true);

          const next = vi.fn().mockResolvedValue("success");
          await middleware({
            ctx: mockCtx,
            next,
          });

          expect(mockCheckPermission).toHaveBeenCalledWith({
            userId: 1,
            teamId: 100,
            permission,
            fallbackRoles: ["ADMIN", "OWNER"],
          });
        });
      });
    });
  });
});
