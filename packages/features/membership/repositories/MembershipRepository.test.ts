import { LookupTarget, ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipRepository } from "./MembershipRepository";

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
    },
  },
}));

describe("MembershipRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasUserInAnyOfTeams - empty teamIds guard", () => {
    it("should return false for empty teamIds array without making a DB call", async () => {
      const repo = new MembershipRepository();
      const result = await repo.hasUserInAnyOfTeams({ userId: 1, teamIds: [] });

      expect(result).toBe(false);
    });
  });

  describe("areAllEmailsAcceptedMembers - empty emails guard", () => {
    it("should return true for empty emails array without making a DB call", async () => {
      const repo = new MembershipRepository();
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

      const result = await MembershipRepository.findAllByUpIdIncludeTeam({ upId: "prof-abc-123" });

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

      const result = await MembershipRepository.findAllByUpIdIncludeTeam({ upId: "prof-abc-123" });

      expect(result).toEqual([]);
    });

    it("should return empty array when profile lookup by id returns null", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
        id: 123,
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);
      vi.mocked(ProfileRepository.findById).mockResolvedValue(null);

      const result = await MembershipRepository.findAllByUpIdIncludeTeam({ upId: "123" });

      expect(result).toEqual([]);
      expect(ProfileRepository.findById).toHaveBeenCalledWith(123);
    });

    it("should return empty array when lookupTarget has neither uid nor id", async () => {
      vi.mocked(ProfileRepository.getLookupTarget).mockReturnValue({
        type: LookupTarget.Profile as unknown as typeof LookupTarget.Profile,
      } as ReturnType<typeof ProfileRepository.getLookupTarget>);

      const result = await MembershipRepository.findAllByUpIdIncludeTeam({ upId: "invalid" });

      expect(result).toEqual([]);
    });
  });
});
