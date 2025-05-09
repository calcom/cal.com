import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { OrganizationPermissionService } from "./OrganizationPermissionService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    organizationOnboarding: {
      findUnique: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
  },
}));

describe("OrganizationPermissionService", () => {
  let service: OrganizationPermissionService;
  const mockUser: TrpcSessionUser = {
    id: 1,
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationPermissionService(mockUser);
  });

  describe("hasPermissionToCreateForEmail", () => {
    it("should allow users to create for their own email", async () => {
      const result = await service.hasPermissionToCreateForEmail("test@example.com");
      expect(result).toBe(true);
    });

    it("should not allow users to create for other emails", async () => {
      const result = await service.hasPermissionToCreateForEmail("other@example.com");
      expect(result).toBe(false);
    });

    it("should allow admins to create for any email", async () => {
      const adminService = new OrganizationPermissionService({ ...mockUser, role: "ADMIN" });
      const result = await adminService.hasPermissionToCreateForEmail("other@example.com");
      expect(result).toBe(true);
    });
  });

  describe("hasPermissionToMigrateTeams", () => {
    it("should return true if user has required permissions for all teams", async () => {
      vi.mocked(prisma.membership.findMany).mockResolvedValue([
        { userId: 1, teamId: 1, role: "OWNER" },
        { userId: 1, teamId: 2, role: "ADMIN" },
      ]);

      const result = await service.hasPermissionToMigrateTeams([1, 2]);
      expect(result).toBe(true);
    });

    it("should return false if user lacks permissions for any team", async () => {
      vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 1, teamId: 1, role: "OWNER" }]);

      const result = await service.hasPermissionToMigrateTeams([1, 2]);
      expect(result).toBe(false);
    });

    it("should return true for empty team list", async () => {
      const result = await service.hasPermissionToMigrateTeams([]);
      expect(result).toBe(true);
    });
  });

  describe("validatePermissions", () => {
    it("should validate all permissions successfully", async () => {
      vi.mocked(prisma.organizationOnboarding.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.membership.findMany).mockResolvedValue([{ userId: 1, teamId: 1, role: "OWNER" }]);

      const result = await service.validatePermissions({
        orgOwnerEmail: "test@example.com",
        teams: [{ id: 1, isBeingMigrated: true }],
      });

      expect(result).toBe(true);
    });

    it("should throw error for unauthorized email", async () => {
      await expect(
        service.validatePermissions({
          orgOwnerEmail: "other@example.com",
        })
      ).rejects.toThrow("you_do_not_have_permission_to_create_an_organization_for_this_email");
    });
  });
});
