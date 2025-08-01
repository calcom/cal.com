import prismaMock from "../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { MembershipRole } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import {
  hasLockedDefaultAvailabilityRestriction,
  checkLockedDefaultAvailabilityRestriction,
} from "./lockedDefaultAvailability";

// Mock the prisma import
vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

describe("lockedDefaultAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasLockedDefaultAvailabilityRestriction", () => {
    it("should return false when user has no team memberships", async () => {
      prismaMock.membership.findMany.mockResolvedValue([]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
      expect(prismaMock.membership.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          accepted: true,
        },
        select: {
          team: {
            select: {
              lockDefaultAvailability: true,
            },
          },
          role: true,
        },
      });
    });

    it("should return false when user is only a member of teams without locked default availability", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.MEMBER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
    });

    it("should return false when user is a member of a locked team but also an admin of any team", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.ADMIN,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
    });

    it("should return false when user is a member of a locked team but also an owner of any team", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.OWNER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
    });

    it("should return true when user is only a member of teams with locked default availability", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(true);
    });

    it("should return true when user is a member of both locked and unlocked teams but has no admin/owner roles", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.MEMBER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(true);
    });

    it("should return false when user is only an admin of teams", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.ADMIN,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.ADMIN,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
    });

    it("should return false when user is only an owner of teams", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.OWNER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.OWNER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(false);
    });

    it("should handle case with only one membership", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
      ]);

      const result = await hasLockedDefaultAvailabilityRestriction(1);

      expect(result).toBe(true);
    });
  });

  describe("checkLockedDefaultAvailabilityRestriction", () => {
    it("should not throw error when user has no restrictions", async () => {
      prismaMock.membership.findMany.mockResolvedValue([]);

      await expect(checkLockedDefaultAvailabilityRestriction(1)).resolves.not.toThrow();
    });

    it("should not throw error when user is admin/owner of any team", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
        {
          team: {
            lockDefaultAvailability: false,
          },
          role: MembershipRole.ADMIN,
        },
      ]);

      await expect(checkLockedDefaultAvailabilityRestriction(1)).resolves.not.toThrow();
    });

    it("should throw TRPCError with FORBIDDEN code when user has restrictions", async () => {
      prismaMock.membership.findMany.mockResolvedValue([
        {
          team: {
            lockDefaultAvailability: true,
          },
          role: MembershipRole.MEMBER,
        },
      ]);

      await expect(checkLockedDefaultAvailabilityRestriction(1)).rejects.toThrow(TRPCError);

      try {
        await checkLockedDefaultAvailabilityRestriction(1);
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toBe(
          "Cannot edit default availability when team has locked default availability setting enabled"
        );
      }
    });
  });
});
