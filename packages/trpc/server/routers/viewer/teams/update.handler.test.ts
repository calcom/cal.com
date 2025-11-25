import { describe, it, expect, vi, beforeEach } from "vitest";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { RRTimestampBasis } from "@calcom/prisma/enums";

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

describe("updateHandler - Permission Check Tests", () => {
  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockTeamRepository = {
    isSlugAvailableForUpdate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(
      () => mockPermissionCheckService as unknown as InstanceType<typeof PermissionCheckService>
    );
    vi.mocked(TeamRepository).mockImplementation(
      () => mockTeamRepository as unknown as InstanceType<typeof TeamRepository>
    );
  });

  describe("Permission Check Service", () => {
    const user: NonNullable<TrpcSessionUser> = {
      id: 1,
      organizationId: 100,
    } as NonNullable<TrpcSessionUser>;

    it("should use permission check service for all users", async () => {
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
        ctx: { user },
        input,
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: user.id,
        teamId: input.id,
        permission: "team.update",
        fallbackRoles: expect.any(Array),
      });
      expect(prisma.team.update).toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when permission check fails", async () => {
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
          ctx: { user },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user has no id", async () => {
      const userWithoutId = {
        id: undefined,
        organizationId: 100,
      } as unknown as NonNullable<TrpcSessionUser>;

      const input: TUpdateInputSchema = {
        id: 50,
        name: "Updated Team",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: 50,
        parentId: 100,
        slug: "test-team",
        metadata: {},
        rrTimestampBasis: RRTimestampBasis.CREATED_AT,
      } as any);

      await expect(
        updateHandler({
          ctx: { user: userWithoutId },
          input,
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
      expect(prisma.team.update).not.toHaveBeenCalled();
    });
  });

  describe("Team Not Found", () => {
    const user: NonNullable<TrpcSessionUser> = {
      id: 1,
      organizationId: 100,
    } as NonNullable<TrpcSessionUser>;

    it("should throw NOT_FOUND when team does not exist", async () => {
      const input: TUpdateInputSchema = {
        id: 999,
        name: "Non-existent Team",
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(
        updateHandler({
          ctx: { user },
          input,
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Team not found.",
      });

      // Should not check permissions if team doesn't exist
      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });
  });
});
