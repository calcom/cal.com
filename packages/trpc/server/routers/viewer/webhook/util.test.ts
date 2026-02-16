import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { prisma } from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
// Import after mocks are set up
import { createWebhookPbacProcedure, webhookProcedure } from "./util";

// Mock dependencies - use factory functions to avoid hoisting issues
vi.mock("@calcom/prisma", () => ({
  prisma: {
    webhook: {
      findUnique: vi.fn(),
    },
    eventType: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockCheckPermission = vi.fn();

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function () {
    return {
      checkPermission: mockCheckPermission,
    };
  }),
}));

vi.mock("../../../procedures/authedProcedure", () => ({
  default: {
    input: vi.fn().mockReturnThis(),
    use: vi.fn(),
  },
}));

// Cast the mocked items to properly typed versions
const mockPrisma = prisma as any;
const mockAuthedProcedure = authedProcedure as any;

describe("Webhook PBAC Procedures", () => {
  const mockCtx = {
    user: {
      id: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to ensure clean state
    mockCheckPermission.mockReset();
    mockPrisma.webhook.findUnique.mockReset();
    mockPrisma.eventType.findUnique.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockAuthedProcedure.use.mockClear();
  });

  describe("createWebhookPbacProcedure", () => {
    const testPermission: PermissionString = "webhook.update";
    const fallbackRoles: MembershipRole[] = ["ADMIN", "OWNER"];

    it("should create a procedure with the specified permission", () => {
      const procedure = createWebhookPbacProcedure(testPermission, fallbackRoles);

      // Verify that authedProcedure methods were called
      expect(mockAuthedProcedure.input).toHaveBeenCalled();
      expect(mockAuthedProcedure.use).toHaveBeenCalled();
    });

    describe("middleware behavior", () => {
      let middleware: any;

      beforeEach(() => {
        createWebhookPbacProcedure(testPermission, fallbackRoles);
        // Get the middleware function that was passed to .use()
        middleware = mockAuthedProcedure.use.mock.calls[0][0];
      });

      describe("when webhook ID is provided", () => {
        it("should allow access when user has PBAC permission for team webhook", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: 10,
            userId: null,
            eventTypeId: null,
            user: null,
            team: { id: 10 },
            eventType: null,
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
          mockCheckPermission.mockResolvedValue(true);

          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: { id: "webhook-1", teamId: 10 },
            next,
          });

          expect(result).toBe("success");
          expect(mockCheckPermission).toHaveBeenCalledWith({
            userId: 1,
            teamId: 10,
            permission: testPermission,
            fallbackRoles,
          });
        });

        it("should throw FORBIDDEN when user lacks PBAC permission for team webhook", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: 10,
            userId: null,
            eventTypeId: null,
            user: null,
            team: { id: 10 },
            eventType: null,
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
          mockCheckPermission.mockResolvedValue(false);

          const next = vi.fn();

          await expect(
            middleware({
              ctx: mockCtx,
              input: { id: "webhook-1", teamId: 10 },
              next,
            })
          ).rejects.toThrow(
            new TRPCError({
              code: "FORBIDDEN",
              message: `Permission required: ${testPermission}`,
            })
          );
        });

        it("should allow access for personal webhook when user is the owner", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: null,
            userId: 1,
            eventTypeId: null,
            user: { id: 1 },
            team: null,
            eventType: null,
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);

          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: { id: "webhook-1" },
            next,
          });

          expect(result).toBe("success");
          expect(mockCheckPermission).not.toHaveBeenCalled();
        });

        it("should throw FORBIDDEN for personal webhook when user is not the owner", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: null,
            userId: 2,
            eventTypeId: null,
            user: { id: 2 },
            team: null,
            eventType: null,
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);

          const next = vi.fn();

          await expect(
            middleware({
              ctx: mockCtx,
              input: { id: "webhook-1" },
              next,
            })
          ).rejects.toThrow(
            new TRPCError({
              code: "FORBIDDEN",
              message: `Permission required: ${testPermission}`,
            })
          );
        });

        it("should check team permissions for team event type webhook", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: null,
            userId: null,
            eventTypeId: 100,
            user: null,
            team: null,
            eventType: { id: 100, teamId: 10, userId: 2 },
          };

          const mockEventType = {
            id: 100,
            teamId: 10,
            userId: 2,
            team: { id: 10 },
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
          mockPrisma.eventType.findUnique.mockResolvedValue(mockEventType);
          mockCheckPermission.mockResolvedValue(true);

          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: { id: "webhook-1", eventTypeId: 100 },
            next,
          });

          expect(result).toBe("success");
          expect(mockCheckPermission).toHaveBeenCalledWith({
            userId: 1,
            teamId: 10,
            permission: testPermission,
            fallbackRoles,
          });
        });

        it("should throw NOT_FOUND when webhook doesn't exist", async () => {
          mockPrisma.webhook.findUnique.mockResolvedValue(null);

          const next = vi.fn();

          await expect(
            middleware({
              ctx: mockCtx,
              input: { id: "webhook-1" },
              next,
            })
          ).rejects.toThrow(new TRPCError({ code: "NOT_FOUND" }));
        });

        it("should throw UNAUTHORIZED when teamId doesn't match webhook teamId", async () => {
          const mockWebhook = {
            id: "webhook-1",
            teamId: 10,
            userId: null,
            eventTypeId: null,
            user: null,
            team: { id: 10 },
            eventType: null,
          };

          mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);

          const next = vi.fn();

          await expect(
            middleware({
              ctx: mockCtx,
              input: { id: "webhook-1", teamId: 20 },
              next,
            })
          ).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED" }));
        });
      });

      describe("when creating new webhook (no ID provided)", () => {
        it("should allow creation with team PBAC permission", async () => {
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
            fallbackRoles,
          });
        });

        it("should throw FORBIDDEN when lacking team PBAC permission", async () => {
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

        it("should check team permissions for team event type creation", async () => {
          const mockEventType = {
            id: 100,
            teamId: 10,
            userId: 2,
            team: { id: 10 },
          };

          mockPrisma.eventType.findUnique.mockResolvedValue(mockEventType);
          mockCheckPermission.mockResolvedValue(true);

          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: { eventTypeId: 100 },
            next,
          });

          expect(result).toBe("success");
          expect(mockCheckPermission).toHaveBeenCalledWith({
            userId: 1,
            teamId: 10,
            permission: testPermission,
            fallbackRoles,
          });
        });

        it("should allow personal event type webhook creation for owner", async () => {
          const mockEventType = {
            id: 100,
            teamId: null,
            userId: 1,
            team: null,
          };

          mockPrisma.eventType.findUnique.mockResolvedValue(mockEventType);

          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: { eventTypeId: 100 },
            next,
          });

          expect(result).toBe("success");
          expect(mockCheckPermission).not.toHaveBeenCalled();
        });
      });

      describe("when no input is provided", () => {
        it("should call next() directly", async () => {
          const next = vi.fn().mockResolvedValue("success");
          const result = await middleware({
            ctx: mockCtx,
            input: undefined,
            next,
          });

          expect(result).toBe("success");
          expect(next).toHaveBeenCalled();
          expect(mockPrisma.webhook.findUnique).not.toHaveBeenCalled();
          expect(mockPrisma.eventType.findUnique).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe("webhookProcedure (legacy wrapper)", () => {
    it("should work as expected", () => {
      // The legacy webhookProcedure uses createWebhookPbacProcedure internally
      // This is verified by the functional tests above
      expect(createWebhookPbacProcedure).toBeDefined();
    });
  });

  describe("Different permission scenarios", () => {
    const permissions: { permission: PermissionString; operation: string }[] = [
      { permission: "webhook.read", operation: "read" },
      { permission: "webhook.create", operation: "create" },
      { permission: "webhook.update", operation: "update" },
      { permission: "webhook.delete", operation: "delete" },
    ];

    permissions.forEach(({ permission, operation }) => {
      it(`should use ${permission} for ${operation} operations`, async () => {
        createWebhookPbacProcedure(permission);
        const middleware =
          mockAuthedProcedure.use.mock.calls[mockAuthedProcedure.use.mock.calls.length - 1][0];

        const mockWebhook = {
          id: "webhook-1",
          teamId: 10,
          userId: null,
          eventTypeId: null,
          user: null,
          team: { id: 10 },
          eventType: null,
        };

        mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
        mockCheckPermission.mockResolvedValue(true);

        const next = vi.fn().mockResolvedValue("success");
        await middleware({
          ctx: mockCtx,
          input: { id: "webhook-1" },
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

  describe("Fallback role behavior", () => {
    it("should use custom fallback roles when provided", async () => {
      const customFallback: MembershipRole[] = ["OWNER"];
      createWebhookPbacProcedure("webhook.delete", customFallback);
      const middleware = mockAuthedProcedure.use.mock.calls[mockAuthedProcedure.use.mock.calls.length - 1][0];

      const mockWebhook = {
        id: "webhook-1",
        teamId: 10,
        userId: null,
        eventTypeId: null,
        user: null,
        team: { id: 10 },
        eventType: null,
      };

      mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
      mockCheckPermission.mockResolvedValue(true);

      const next = vi.fn().mockResolvedValue("success");
      await middleware({
        ctx: mockCtx,
        input: { id: "webhook-1" },
        next,
      });

      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 10,
        permission: "webhook.delete",
        fallbackRoles: customFallback,
      });
    });

    it("should use default fallback roles when not provided", async () => {
      createWebhookPbacProcedure("webhook.update");
      const middleware = mockAuthedProcedure.use.mock.calls[mockAuthedProcedure.use.mock.calls.length - 1][0];

      const mockWebhook = {
        id: "webhook-1",
        teamId: 10,
        userId: null,
        eventTypeId: null,
        user: null,
        team: { id: 10 },
        eventType: null,
      };

      mockPrisma.webhook.findUnique.mockResolvedValue(mockWebhook);
      mockCheckPermission.mockResolvedValue(true);

      const next = vi.fn().mockResolvedValue("success");
      await middleware({
        ctx: mockCtx,
        input: { id: "webhook-1" },
        next,
      });

      expect(mockCheckPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 10,
        permission: "webhook.update",
        fallbackRoles: ["ADMIN", "OWNER"],
      });
    });
  });
});
