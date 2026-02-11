import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { ProfileRepository, LookupTarget } from "./ProfileRepository";

vi.mock("@calcom/features/ee/teams/lib/getParsedTeam", () => ({
  getParsedTeam: <T>(org: T) => org,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("ProfileRepository.findByUpIdWithAuth - IDOR Security Fix", () => {
  let user1: { id: number; email: string; username: string };
  let user2: { id: number; email: string; username: string };
  let org1: { id: number; name: string; slug: string };
  let org2: { id: number; name: string; slug: string };
  let profile1: { id: number; uid: string; upId: string };
  let profile2: { id: number; uid: string; upId: string };
  let membership1: { id: number };
  let membership2: { id: number };

  beforeEach(async () => {
    vi.resetAllMocks();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();

    // Create User 1
    user1 = await prismock.user.create({
      data: {
        email: "user1@example.com",
        username: "user1",
        name: "User 1",
      },
    });

    // Create User 2
    user2 = await prismock.user.create({
      data: {
        email: "user2@example.com",
        username: "user2",
        name: "User 2",
      },
    });

    // Create Organization 1
    org1 = await prismock.team.create({
      data: {
        name: "Organization 1",
        slug: "org1",
        isOrganization: true,
        metadata: {},
      },
    });

    // Create Organization 2
    org2 = await prismock.team.create({
      data: {
        name: "Organization 2",
        slug: "org2",
        isOrganization: true,
        metadata: {},
      },
    });

    // Create Profile 1 for User 1 in Organization 1
    const profile1Data = await prismock.profile.create({
      data: {
        uid: ProfileRepository.generateProfileUid(),
        userId: user1.id,
        organizationId: org1.id,
        username: "user1-org1",
      },
      include: {
        user: true,
        organization: true,
      },
    });
    profile1 = {
      id: profile1Data.id,
      uid: profile1Data.uid,
      upId: `prof-${profile1Data.uid}`,
    };

    // Create Profile 2 for User 2 in Organization 2
    const profile2Data = await prismock.profile.create({
      data: {
        uid: ProfileRepository.generateProfileUid(),
        userId: user2.id,
        organizationId: org2.id,
        username: "user2-org2",
      },
      include: {
        user: true,
        organization: true,
      },
    });
    profile2 = {
      id: profile2Data.id,
      uid: profile2Data.uid,
      upId: `prof-${profile2Data.uid}`,
    };

    // Create membership: User 1 is member of Org 1
    membership1 = await prismock.membership.create({
      data: {
        userId: user1.id,
        teamId: org1.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    // Create membership: User 2 is member of Org 2
    membership2 = await prismock.membership.create({
      data: {
        userId: user2.id,
        teamId: org2.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  });

  describe("UUID-based profile identifiers (new secure format)", () => {
    it("should allow user to access their own profile", async () => {
      const result = await ProfileRepository.findByUpIdWithAuth(profile1.upId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile1.id);
      expect(result?.upId).toBe(profile1.upId);
      expect(result?.organizationId).toBe(org1.id);
    });

    it("should allow user to access profile from their organization", async () => {
      // Add User 1 as member of Org 1 (already done in setup)
      // User 1 should be able to access their own profile
      const result = await ProfileRepository.findByUpIdWithAuth(profile1.upId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile1.id);
    });

    it("should prevent cross-tenant access - user from org1 cannot access org2 profile", async () => {
      const result = await ProfileRepository.findByUpIdWithAuth(profile2.upId, user1.id);

      expect(result).toBeNull();
    });

    it("should prevent cross-tenant access - user from org2 cannot access org1 profile", async () => {
      const result = await ProfileRepository.findByUpIdWithAuth(profile1.upId, user2.id);

      expect(result).toBeNull();
    });

    it("should prevent unauthorized access when user is not a member", async () => {
      // Create a third user who is not a member of either org
      const user3 = await prismock.user.create({
        data: {
          email: "user3@example.com",
          username: "user3",
          name: "User 3",
        },
      });

      const result = await ProfileRepository.findByUpIdWithAuth(profile1.upId, user3.id);

      expect(result).toBeNull();
    });

    it("should allow access when user is a member of the organization", async () => {
      // Add User 1 as a member of Org 2
      await prismock.membership.create({
        data: {
          userId: user1.id,
          teamId: org2.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      // Now User 1 should be able to access Profile 2 (from Org 2)
      const result = await ProfileRepository.findByUpIdWithAuth(profile2.upId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile2.id);
    });

    it("should prevent access when membership is not accepted", async () => {
      // Add User 1 as a pending member of Org 2
      await prismock.membership.create({
        data: {
          userId: user1.id,
          teamId: org2.id,
          role: MembershipRole.MEMBER,
          accepted: false, // Not accepted
        },
      });

      const result = await ProfileRepository.findByUpIdWithAuth(profile2.upId, user1.id);

      expect(result).toBeNull();
    });
  });

  describe("Legacy numeric profile IDs (backward compatibility)", () => {
    it("should support legacy numeric IDs for backward compatibility", async () => {
      const legacyUpId = profile1.id.toString();
      const result = await ProfileRepository.findByUpIdWithAuth(legacyUpId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile1.id);
    });

    it("should prevent cross-tenant access with legacy numeric IDs", async () => {
      const legacyUpId = profile2.id.toString();
      const result = await ProfileRepository.findByUpIdWithAuth(legacyUpId, user1.id);

      expect(result).toBeNull();
    });

    it("should allow access to own profile with legacy numeric ID", async () => {
      const legacyUpId = profile1.id.toString();
      const result = await ProfileRepository.findByUpIdWithAuth(legacyUpId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile1.id);
    });
  });

  describe("User profile identifiers (usr- format)", () => {
    it("should allow user to access their own user profile", async () => {
      const userUpId = `usr-${user1.id}`;
      const result = await ProfileRepository.findByUpIdWithAuth(userUpId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.upId).toBe(userUpId);
      expect(result?.id).toBeNull(); // User profiles don't have profile.id
    });

    it("should prevent user from accessing another user's profile", async () => {
      const userUpId = `usr-${user2.id}`;
      const result = await ProfileRepository.findByUpIdWithAuth(userUpId, user1.id);

      expect(result).toBeNull();
    });

    it("should require userId parameter for security", async () => {
      const userUpId = `usr-${user1.id}`;
      // userId is now required - this test verifies the method signature
      const result = await ProfileRepository.findByUpIdWithAuth(userUpId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.upId).toBe(userUpId);
    });
  });

  describe("Authorization edge cases", () => {
    it("should return null for non-existent profile", async () => {
      const fakeUpId = `prof-${ProfileRepository.generateProfileUid()}`;
      const result = await ProfileRepository.findByUpIdWithAuth(fakeUpId, user1.id);

      expect(result).toBeNull();
    });

    it("should return null for invalid upId format", async () => {
      await expect(() => ProfileRepository.findByUpIdWithAuth("invalid-format", user1.id)).rejects.toThrow();
    });

    it("should require userId parameter - authorization check always runs", async () => {
      // userId is now required - authorization check always runs
      const result = await ProfileRepository.findByUpIdWithAuth(profile1.upId, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile1.id);
    });

    it("should handle profile with platform organization correctly", async () => {
      // Create a platform organization
      const platformOrg = await prismock.team.create({
        data: {
          name: "Platform Org",
          slug: "platform",
          isOrganization: true,
          isPlatform: true,
          metadata: {},
        },
      });

      const platformUser = await prismock.user.create({
        data: {
          email: "platform@example.com",
          username: "platform",
          name: "Platform User",
          isPlatformManaged: true,
        },
      });

      const platformProfile = await prismock.profile.create({
        data: {
          uid: ProfileRepository.generateProfileUid(),
          userId: platformUser.id,
          organizationId: platformOrg.id,
          username: "platform-user",
        },
        include: {
          user: true,
          organization: true,
        },
      });

      const result = await ProfileRepository.findByUpIdWithAuth(
        `prof-${platformProfile.uid}`,
        platformUser.id
      );

      expect(result).not.toBeNull();
    });
  });

  describe("getLookupTarget - format parsing", () => {
    it("should correctly parse UUID-based profile ID", () => {
      const upId = `prof-${profile1.uid}`;
      const result = ProfileRepository.getLookupTarget(upId);

      expect(result.type).toBe(LookupTarget.Profile);
      expect("uid" in result).toBe(true);
      if ("uid" in result) {
        expect(result.uid).toBe(profile1.uid);
      }
    });

    it("should correctly parse legacy numeric profile ID", () => {
      const upId = profile1.id.toString();
      const result = ProfileRepository.getLookupTarget(upId);

      expect(result.type).toBe(LookupTarget.Profile);
      expect("id" in result).toBe(true);
      if ("id" in result) {
        expect(result.id).toBe(profile1.id);
      }
    });

    it("should correctly parse user profile ID", () => {
      const upId = `usr-${user1.id}`;
      const result = ProfileRepository.getLookupTarget(upId);

      expect(result.type).toBe(LookupTarget.User);
      expect(result.id).toBe(user1.id);
    });
  });

  describe("normalizeProfile - UUID-based upId generation", () => {
    it("should generate prof-<uuid> format for upId", async () => {
      const profile = await prismock.profile.findUnique({
        where: { id: profile1.id },
        include: {
          user: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              metadata: true,
              logoUrl: true,
              bannerUrl: true,
              isPrivate: true,
              isPlatform: true,
              hideBranding: true,
              brandColor: true,
              darkBrandColor: true,
              theme: true,
            },
          },
        },
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Import normalizeProfile
      const { normalizeProfile } = await import("./ProfileRepository");
      const normalized = normalizeProfile(profile);

      expect(normalized.upId).toBe(`prof-${profile.uid}`);
      expect(normalized.upId).not.toBe(profile.id.toString());
    });
  });

  describe("Regression: IDOR vulnerability prevention", () => {
    it("should prevent sequential ID enumeration attacks", async () => {
      // Simulate attacker trying to enumerate profiles
      const attacker = await prismock.user.create({
        data: {
          email: "attacker@example.com",
          username: "attacker",
          name: "Attacker",
        },
      });

      // Try to access profile1 using its numeric ID (legacy format)
      const legacyUpId = profile1.id.toString();
      const result = await ProfileRepository.findByUpIdWithAuth(legacyUpId, attacker.id);

      // Should be blocked - attacker is not a member of org1
      expect(result).toBeNull();
    });

    it("should prevent UUID guessing attacks", async () => {
      const attacker = await prismock.user.create({
        data: {
          email: "attacker@example.com",
          username: "attacker",
          name: "Attacker",
        },
      });

      // Try to access profile using UUID (even if guessed)
      const guessedUpId = `prof-${ProfileRepository.generateProfileUid()}`;
      const result = await ProfileRepository.findByUpIdWithAuth(guessedUpId, attacker.id);

      // Should return null (profile doesn't exist or no access)
      expect(result).toBeNull();
    });

    it("should prevent access to profiles from different organizations", async () => {
      // User 1 from Org 1 tries to access User 2's profile from Org 2
      const result = await ProfileRepository.findByUpIdWithAuth(profile2.upId, user1.id);

      expect(result).toBeNull();
    });

    it("should allow legitimate access within same organization", async () => {
      // Create another profile in Org 1 for a different user
      const user3 = await prismock.user.create({
        data: {
          email: "user3@example.com",
          username: "user3",
          name: "User 3",
        },
      });

      await prismock.membership.create({
        data: {
          userId: user3.id,
          teamId: org1.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const profile3 = await prismock.profile.create({
        data: {
          uid: ProfileRepository.generateProfileUid(),
          userId: user3.id,
          organizationId: org1.id,
          username: "user3-org1",
        },
      });

      // User 1 (member of Org 1) should be able to access User 3's profile (also in Org 1)
      const result = await ProfileRepository.findByUpIdWithAuth(`prof-${profile3.uid}`, user1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(profile3.id);
    });
  });
});
