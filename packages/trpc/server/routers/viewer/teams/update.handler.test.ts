import { describe, it, expect, vi, beforeEach } from "vitest";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { RRTimestampBasis } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { updateHandler } from "./update.handler";
import type { TUpdateInputSchema } from "./update.schema";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    eventType: {
      updateMany: vi.fn(),
    },
    tempOrgRedirect: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(() => ({
    checkPermission: vi.fn(),
  })),
}));

vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: vi.fn().mockImplementation(() => ({
    isSlugAvailableForUpdate: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadLogo: vi.fn().mockResolvedValue("https://example.com/logo.png"),
}));

vi.mock("@calcom/lib/intervalLimits/validateIntervalLimitOrder", () => ({
  validateIntervalLimitOrder: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_TEAM_BILLING_ENABLED: false,
}));

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn((slug: string) => `https://${slug}.cal.com`),
}));

describe("updateHandler - Security Fix Tests", () => {
  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockTeamRepository = {
    isSlugAvailableForUpdate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(
      () => mockPermissionCheckService as InstanceType<typeof PermissionCheckService>
    );
    vi.mocked(TeamRepository).mockImplementation(
      () => mockTeamRepository as InstanceType<typeof TeamRepository>
    );
  });

  describe("Organization Admin Access Control", () => {
    const orgAdminUser: NonNullable<TrpcSessionUser> = {
      id: 1,
      organizationId: 100,
      organization: {
        isOrgAdmin: true,
      },
    } as NonNullable<TrpcSessionUser>;

    const otherOrgId = 200;
    const orgTeamId = 100; // Same as organizationId
    const childTeamId = 101; // Child team of org 100
    const otherOrgTeamId = 201; // Team from different org

    it("should allow org admin to update their own organization", async () => {
      const input: TUpdateInputSchema = {
        id: orgTeamId,
        name: "Updated Org Name",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: orgTeamId,
        parentId: null,
        slug: "test-org",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      vi.mocked(prisma.team.update).mockResolvedValue({
        id: orgTeamId,
        name: "Updated Org Name",
        bio: null,
        slug: "test-org",
        theme: null,
        brandColor: null,
        darkBrandColor: null,
        logoUrl: null,
        bookingLimits: null,
        includeManagedEventsInLimits: null,
        rrResetInterval: null,
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      const result = await updateHandler({
        ctx: { user: orgAdminUser },
        input,
      });

      expect(result.name).toBe("Updated Org Name");
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: orgTeamId },
        select: {
          id: true,
          parentId: true,
          slug: true,
          metadata: true,
          rrTimestampBasis: true,
        },
      });
    });

    it("should allow org admin to update child teams within their organization", async () => {
      const input: TUpdateInputSchema = {
        id: childTeamId,
        name: "Updated Child Team",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: childTeamId,
        parentId: orgAdminUser.organizationId, // Team belongs to org
        slug: "child-team",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      vi.mocked(prisma.team.update).mockResolvedValue({
        id: childTeamId,
        name: "Updated Child Team",
        bio: null,
        slug: "child-team",
        theme: null,
        brandColor: null,
        darkBrandColor: null,
        logoUrl: null,
        bookingLimits: null,
        includeManagedEventsInLimits: null,
        rrResetInterval: null,
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      const result = await updateHandler({
        ctx: { user: orgAdminUser },
        input,
      });

      expect(result.name).toBe("Updated Child Team");
      expect(prisma.team.update).toHaveBeenCalled();
    });

    it("should prevent org admin from updating teams from other organizations", async () => {
      const input: TUpdateInputSchema = {
        id: otherOrgTeamId,
        name: "Malicious Update",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: otherOrgTeamId,
        parentId: otherOrgId, // Team belongs to different org
        slug: "other-org-team",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      await expect(
        updateHandler({
          ctx: { user: orgAdminUser },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You can only update teams within your organization.",
      });

      // Should not proceed to update
      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it("should prevent org admin from updating teams with no parent (standalone teams)", async () => {
      const input: TUpdateInputSchema = {
        id: 999,
        name: "Standalone Team",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 999,
        parentId: null, // Standalone team, not part of any org
        slug: "standalone",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      await expect(
        updateHandler({
          ctx: { user: orgAdminUser },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You can only update teams within your organization.",
      });

      expect(prisma.team.update).not.toHaveBeenCalled();
    });
  });

  describe("Non-Org Admin Access Control", () => {
    const regularUser: NonNullable<TrpcSessionUser> = {
      id: 2,
      organizationId: 100,
      organization: {
        isOrgAdmin: false,
      },
    } as NonNullable<TrpcSessionUser>;

    it("should use permission check service for non-org admins", async () => {
      const input: TUpdateInputSchema = {
        id: 50,
        name: "Updated Team",
      };

      mockPermissionCheckService.checkPermission.mockResolvedValue(true);

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 50,
        parentId: 100,
        slug: "test-team",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      vi.mocked(prisma.team.update).mockResolvedValue({
        id: 50,
        name: "Updated Team",
        bio: null,
        slug: "test-team",
        theme: null,
        brandColor: null,
        darkBrandColor: null,
        logoUrl: null,
        bookingLimits: null,
        includeManagedEventsInLimits: null,
        rrResetInterval: null,
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      await updateHandler({
        ctx: { user: regularUser },
        input,
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: regularUser.id,
        teamId: input.id,
        permission: "team.update",
        fallbackRoles: expect.any(Array),
      });
    });

    it("should throw UNAUTHORIZED when non-org admin lacks permission", async () => {
      const input: TUpdateInputSchema = {
        id: 50,
        name: "Unauthorized Update",
      };

      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 50,
        parentId: 100,
        slug: "test-team",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      await expect(
        updateHandler({
          ctx: { user: regularUser },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      expect(prisma.team.update).not.toHaveBeenCalled();
    });
  });

  describe("Team Not Found", () => {
    const orgAdminUser: NonNullable<TrpcSessionUser> = {
      id: 1,
      organizationId: 100,
      organization: {
        isOrgAdmin: true,
      },
    } as NonNullable<TrpcSessionUser>;

    it("should throw NOT_FOUND when team does not exist", async () => {
      const input: TUpdateInputSchema = {
        id: 999,
        name: "Non-existent Team",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(
        updateHandler({
          ctx: { user: orgAdminUser },
          input,
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Team not found.",
      });
    });
  });
});
