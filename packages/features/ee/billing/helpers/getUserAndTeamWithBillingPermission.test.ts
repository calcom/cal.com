import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { getUserAndTeamWithBillingPermission } from "./getUserAndTeamWithBillingPermission";

const mockFindById = vi.fn();
const mockFindTeamMembersWithPermission = vi.fn();
const mockUserFindById = vi.fn();
const mockGetTranslation = vi.fn();

vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => {
  return {
    TeamRepository: class {
      findById = mockFindById;
      findTeamMembersWithPermission = mockFindTeamMembersWithPermission;
    },
  };
});

vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: class {
      findById = mockUserFindById;
    },
  };
});

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: (...args: unknown[]) => mockGetTranslation(...args),
}));

describe("getUserAndTeamWithBillingPermission", () => {
  const mockPrismaClient = {} as PrismaClient;
  const mockTranslationFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTranslation.mockResolvedValue(mockTranslationFn);
  });

  describe("no userId or teamId", () => {
    it("should return empty result when neither is provided", async () => {
      const result = await getUserAndTeamWithBillingPermission({ prismaClient: mockPrismaClient });
      expect(result).toEqual({});
    });

    it("should return empty result when both are null", async () => {
      const result = await getUserAndTeamWithBillingPermission({
        userId: null,
        teamId: null,
        prismaClient: mockPrismaClient,
      });
      expect(result).toEqual({});
    });
  });

  describe("team-based requests", () => {
    it("should return team with billing admins for regular team", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: "Test Team", isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: 10, name: "Admin", email: "admin@test.com", locale: "en" },
      ]);

      const result = await getUserAndTeamWithBillingPermission({
        teamId: 1,
        prismaClient: mockPrismaClient,
      });

      expect(result.team).toBeDefined();
      expect(result.team!.id).toBe(1);
      expect(result.team!.name).toBe("Test Team");
      expect(result.team!.adminAndOwners).toHaveLength(1);
      expect(result.team!.adminAndOwners[0].id).toBe(10);
      expect(result.team!.adminAndOwners[0].t).toBe(mockTranslationFn);

      expect(mockFindTeamMembersWithPermission).toHaveBeenCalledWith({
        teamId: 1,
        permission: "team.manageBilling",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });
    });

    it("should use organization permission for org teams", async () => {
      mockFindById.mockResolvedValue({ id: 2, name: "Org", isOrganization: true });
      mockFindTeamMembersWithPermission.mockResolvedValue([]);

      await getUserAndTeamWithBillingPermission({
        teamId: 2,
        prismaClient: mockPrismaClient,
      });

      expect(mockFindTeamMembersWithPermission).toHaveBeenCalledWith({
        teamId: 2,
        permission: "organization.manageBilling",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });
    });

    it("should return empty result when team is not found", async () => {
      mockFindById.mockResolvedValue(null);

      const result = await getUserAndTeamWithBillingPermission({
        teamId: 999,
        prismaClient: mockPrismaClient,
      });

      expect(result).toEqual({});
    });

    it("should handle empty team name gracefully", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: null, isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([]);

      const result = await getUserAndTeamWithBillingPermission({
        teamId: 1,
        prismaClient: mockPrismaClient,
      });

      expect(result.team!.name).toBe("");
    });

    it("should use user locale for translation", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: "Team", isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: 10, name: "User", email: "u@t.com", locale: "fr" },
      ]);

      await getUserAndTeamWithBillingPermission({ teamId: 1, prismaClient: mockPrismaClient });

      expect(mockGetTranslation).toHaveBeenCalledWith("fr", "common");
    });

    it("should default to 'en' when user locale is null", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: "Team", isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: 10, name: "User", email: "u@t.com", locale: null },
      ]);

      await getUserAndTeamWithBillingPermission({ teamId: 1, prismaClient: mockPrismaClient });

      expect(mockGetTranslation).toHaveBeenCalledWith("en", "common");
    });
  });

  describe("user-based requests", () => {
    it("should return user when found", async () => {
      mockUserFindById.mockResolvedValue({
        id: 5,
        name: "John",
        email: "john@test.com",
        locale: "en",
      });

      const result = await getUserAndTeamWithBillingPermission({
        userId: 5,
        prismaClient: mockPrismaClient,
      });

      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(5);
      expect(result.user!.name).toBe("John");
      expect(result.user!.email).toBe("john@test.com");
      expect(result.user!.t).toBe(mockTranslationFn);
    });

    it("should return empty result when user not found", async () => {
      mockUserFindById.mockResolvedValue(null);

      const result = await getUserAndTeamWithBillingPermission({
        userId: 999,
        prismaClient: mockPrismaClient,
      });

      expect(result).toEqual({});
    });

    it("should default locale to 'en' when null", async () => {
      mockUserFindById.mockResolvedValue({ id: 5, name: "John", email: "j@t.com", locale: null });

      await getUserAndTeamWithBillingPermission({ userId: 5, prismaClient: mockPrismaClient });

      expect(mockGetTranslation).toHaveBeenCalledWith("en", "common");
    });
  });

  describe("priority", () => {
    it("should prioritize teamId when both userId and teamId are provided", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: "Team", isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([]);

      const result = await getUserAndTeamWithBillingPermission({
        userId: 5,
        teamId: 1,
        prismaClient: mockPrismaClient,
      });

      expect(result.team).toBeDefined();
      expect(result.user).toBeUndefined();
      expect(mockUserFindById).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should propagate errors from TeamRepository.findById", async () => {
      mockFindById.mockRejectedValue(new Error("DB error"));

      await expect(
        getUserAndTeamWithBillingPermission({ teamId: 1, prismaClient: mockPrismaClient })
      ).rejects.toThrow("DB error");
    });

    it("should propagate errors from UserRepository.findById", async () => {
      mockUserFindById.mockRejectedValue(new Error("User DB error"));

      await expect(
        getUserAndTeamWithBillingPermission({ userId: 1, prismaClient: mockPrismaClient })
      ).rejects.toThrow("User DB error");
    });

    it("should propagate errors from getTranslation", async () => {
      mockFindById.mockResolvedValue({ id: 1, name: "Team", isOrganization: false });
      mockFindTeamMembersWithPermission.mockResolvedValue([
        { id: 10, name: "User", email: "u@t.com", locale: "en" },
      ]);
      mockGetTranslation.mockRejectedValue(new Error("Translation failed"));

      await expect(
        getUserAndTeamWithBillingPermission({ teamId: 1, prismaClient: mockPrismaClient })
      ).rejects.toThrow("Translation failed");
    });
  });
});
