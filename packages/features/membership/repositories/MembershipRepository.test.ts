import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { LookupTarget, ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    getLookupTarget: vi.fn(),
    findByUid: vi.fn(),
    findById: vi.fn(),
  },
  LookupTarget: {
    Profile: "Profile",
    User: "User",
  },
}));

// Mock prisma to prevent actual DB calls in unit tests
vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import { prisma } from "@calcom/prisma";

describe("MembershipRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasUserInAnyOfTeams - empty teamIds guard", () => {
    it("should return false for empty teamIds array without making a DB call", async () => {
      const repo = getMembershipRepository();
      const result = await repo.hasUserInAnyOfTeams({ userId: 1, teamIds: [] });

      expect(result).toBe(false);
    });
  });

  describe("isUserMemberOfAllTeams", () => {
    it("should return true for empty teamIds array without making a DB call", async () => {
      const repo = getMembershipRepository();
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [] });

      expect(result).toBe(true);
      expect(prisma.membership.count).not.toHaveBeenCalled();
    });

    it("should return true when user is member of all specified teams", async () => {
      vi.mocked(prisma.membership.count).mockResolvedValue(3);

      const repo = getMembershipRepository();
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [1, 2, 3] });

      expect(result).toBe(true);
      expect(prisma.membership.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          teamId: { in: [1, 2, 3] },
        },
      });
    });

    it("should return false when user is member of only some teams", async () => {
      vi.mocked(prisma.membership.count).mockResolvedValue(2);

      const repo = getMembershipRepository();
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [1, 2, 3] });

      expect(result).toBe(false);
    });

    it("should return false when user is not a member of any specified teams", async () => {
      vi.mocked(prisma.membership.count).mockResolvedValue(0);

      const repo = getMembershipRepository();
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [1, 2] });

      expect(result).toBe(false);
    });

    it("should return true for a single team when user is a member", async () => {
      vi.mocked(prisma.membership.count).mockResolvedValue(1);

      const repo = getMembershipRepository();
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [5] });

      expect(result).toBe(true);
    });

    it("should handle duplicate teamIds correctly", async () => {
      // SQL IN clause deduplicates, so count returns 2 for unique teams [1, 2]
      vi.mocked(prisma.membership.count).mockResolvedValue(2);

      const repo = getMembershipRepository();
      // Duplicate teamIds: [1, 1, 2] - user is member of both unique teams
      const result = await repo.isUserMemberOfAllTeams({ userId: 1, teamIds: [1, 1, 2] });

      expect(result).toBe(true);
      // Should query with deduplicated teamIds
      expect(prisma.membership.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          teamId: { in: [1, 2] },
        },
      });
    });
  });

  describe("areAllEmailsAcceptedMembers - empty emails guard", () => {
    it("should return true for empty emails array without making a DB call", async () => {
      const repo = getMembershipRepository();
      const result = await repo.areAllEmailsAcceptedMembers({ emails: [], teamId: 1 });

      expect(result).toBe(true);
    });
  });

  describe("getWhereForfindAllByUpId (via findAllByUpIdIncludeTeam)", () => {
    it("should return empty array when profile lookup by uid returns null", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
        uid: "abc-123",
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);
      vi.mocked(ProfileRepository.findByUid).mockResolvedValue(null);

      const repo = getMembershipRepository();
      const result = await repo.findAllByUpIdIncludeTeam({ upId: "prof-abc-123" });

      expect(result).toEqual([]);
      expect(ProfileRepository.findByUid).toHaveBeenCalledWith("abc-123");
    });

    it("should return empty array when profile found but has no user", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
        uid: "abc-123",
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);
      vi.mocked(ProfileRepository.findByUid).mockResolvedValue({
        user: undefined,
      } as Awaited<ReturnType<typeof ProfileRepository.findByUid>>);

      const repo = getMembershipRepository();
      const result = await repo.findAllByUpIdIncludeTeam({ upId: "prof-abc-123" });

      expect(result).toEqual([]);
    });

    it("should return empty array when profile lookup by id returns null", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
        id: 123,
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);
      vi.mocked(ProfileRepository.findById).mockResolvedValue(null);

      const repo = getMembershipRepository();
      const result = await repo.findAllByUpIdIncludeTeam({ upId: "123" });

      expect(result).toEqual([]);
      expect(ProfileRepository.findById).toHaveBeenCalledWith(123);
    });

    it("should return empty array when lookupTarget has neither uid nor id", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);

      const repo = getMembershipRepository();
      const result = await repo.findAllByUpIdIncludeTeam({ upId: "invalid" });

      expect(result).toEqual([]);
    });
  });
});
