import { describe, expect, it, beforeEach, vi } from "vitest";

import { Plans } from "@calcom/prisma/enums";

import { MembershipRepository } from "../membership";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(await import("@calcom/prisma")).prisma;

describe("MembershipRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAllMembershipsByUserIdForBilling", () => {
    it("should return empty array when user has no memberships", async () => {
      mockPrisma.membership.findMany.mockResolvedValue([]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toEqual([]);
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith({
        where: { userId: 123 },
        select: {
          accepted: true,
          user: {
            select: {
              isPlatformManaged: true,
            },
          },
          team: {
            select: {
              slug: true,
              plan: true,
              isOrganization: true,
              isPlatform: true,
              platformBilling: {
                select: {
                  plan: true,
                },
              },
              parent: {
                select: {
                  plan: true,
                  isOrganization: true,
                  isPlatform: true,
                },
              },
            },
          },
        },
      });
    });

    it("should return membership with team plan data", async () => {
      const mockMembership = {
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "test-team",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          platformBilling: null,
          parent: null,
        },
      };

      mockPrisma.membership.findMany.mockResolvedValue([mockMembership]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "test-team",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          platformBilling: null,
          parent: null,
        },
      });
    });

    it("should return membership with organization data", async () => {
      const mockMembership = {
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "test-org",
          plan: Plans.ORGANIZATIONS,
          isOrganization: true,
          isPlatform: false,
          platformBilling: null,
          parent: null,
        },
      };

      mockPrisma.membership.findMany.mockResolvedValue([mockMembership]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "test-org",
          plan: Plans.ORGANIZATIONS,
          isOrganization: true,
          isPlatform: false,
          platformBilling: null,
          parent: null,
        },
      });
    });

    it("should return membership with parent organization data", async () => {
      const mockMembership = {
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "child-team",
          plan: Plans.ORGANIZATIONS,
          isOrganization: false,
          isPlatform: false,
          platformBilling: null,
          parent: {
            plan: Plans.ORGANIZATIONS,
            isOrganization: true,
            isPlatform: false,
          },
        },
      };

      mockPrisma.membership.findMany.mockResolvedValue([mockMembership]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: "child-team",
          plan: Plans.ORGANIZATIONS,
          isOrganization: false,
          isPlatform: false,
          platformBilling: null,
          parent: {
            plan: Plans.ORGANIZATIONS,
            isOrganization: true,
            isPlatform: false,
          },
        },
      });
    });

    it("should return membership with platform billing data", async () => {
      const mockMembership = {
        accepted: true,
        user: {
          isPlatformManaged: true,
        },
        team: {
          slug: "platform-team",
          plan: null,
          isOrganization: false,
          isPlatform: true,
          platformBilling: {
            plan: "ESSENTIALS",
          },
          parent: null,
        },
      };

      mockPrisma.membership.findMany.mockResolvedValue([mockMembership]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        accepted: true,
        user: {
          isPlatformManaged: true,
        },
        team: {
          slug: "platform-team",
          plan: null,
          isOrganization: false,
          isPlatform: true,
          platformBilling: {
            plan: "ESSENTIALS",
          },
          parent: null,
        },
      });
    });

    it("should return multiple memberships for user", async () => {
      const mockMemberships = [
        {
          accepted: true,
          user: {
            isPlatformManaged: false,
          },
          team: {
            slug: "team-1",
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            platformBilling: null,
            parent: null,
          },
        },
        {
          accepted: false,
          user: {
            isPlatformManaged: false,
          },
          team: {
            slug: "team-2",
            plan: Plans.TEAMS,
            isOrganization: false,
            isPlatform: false,
            platformBilling: null,
            parent: null,
          },
        },
      ];

      mockPrisma.membership.findMany.mockResolvedValue(mockMemberships);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(2);
      expect(result[0].accepted).toBe(true);
      expect(result[1].accepted).toBe(false);
      expect(result[0].team.slug).toBe("team-1");
      expect(result[1].team.slug).toBe("team-2");
    });

    it("should handle teams without slugs", async () => {
      const mockMembership = {
        accepted: true,
        user: {
          isPlatformManaged: false,
        },
        team: {
          slug: null,
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          platformBilling: null,
          parent: null,
        },
      };

      mockPrisma.membership.findMany.mockResolvedValue([mockMembership]);

      const result = await MembershipRepository.findAllMembershipsByUserIdForBilling({
        userId: 123,
      });

      expect(result).toHaveLength(1);
      expect(result[0].team.slug).toBeNull();
      expect(result[0].team.plan).toBe(Plans.TEAMS);
    });
  });
});
