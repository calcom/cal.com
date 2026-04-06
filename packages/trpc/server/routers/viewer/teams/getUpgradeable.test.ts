import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import getUpgradeableHandler from "./getUpgradeable.handler";

vi.mock("@calcom/lib/constants", () => ({
  IS_TEAM_BILLING_ENABLED: true,
}));

describe("getUpgradeableHandler", () => {
  const ctx = {
    userId: 1137,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an empty array when no teams match", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);

    const result = await getUpgradeableHandler(ctx);
    expect(result).toEqual([]);
  });

  it("should query with correct where clause filtering teams without billing at DB level", async () => {
    // Filtering now happens at the DB level via Prisma where clause:
    // - parentId: null (exclude sub-teams)
    // - isOrganization: false (exclude orgs, handled by OrgUpgradeBanner)
    // - teamBilling: null (only teams without a billing record)
    // - children: { none: {} } (exclude orgs disguised as teams)
    const expectedTeams = [
      {
        id: 1,
        teamId: 10,
        userId: 1137,
        role: MembershipRole.OWNER,
        accepted: true,
        team: {
          id: 10,
          name: "Team Without Billing",
          slug: "team-without-billing",
          isOrganization: false,
          metadata: {},
        },
      },
    ];

    prismaMock.membership.findMany.mockResolvedValue(expectedTeams);

    const result = await getUpgradeableHandler(ctx);

    expect(result).toEqual(expectedTeams);
    expect(prismaMock.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { id: ctx.userId },
          role: MembershipRole.OWNER,
          team: expect.objectContaining({
            parentId: null,
            isOrganization: false,
            teamBilling: null,
            children: { none: {} },
          }),
        }),
      })
    );
  });

  it("should select the correct fields from prisma", async () => {
    prismaMock.membership.findMany.mockResolvedValue([]);

    await getUpgradeableHandler(ctx);

    expect(prismaMock.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          teamId: true,
          userId: true,
          role: true,
          accepted: true,
          team: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              name: true,
              slug: true,
              isOrganization: true,
              metadata: true,
            }),
          }),
        }),
      })
    );
  });

  it("should return all results from the query without additional in-memory filtering", async () => {
    const multipleTeams = [
      {
        id: 1,
        teamId: 10,
        userId: 1137,
        role: MembershipRole.OWNER,
        accepted: true,
        team: {
          id: 10,
          name: "Team A",
          slug: "team-a",
          isOrganization: false,
          metadata: {},
        },
      },
      {
        id: 2,
        teamId: 20,
        userId: 1137,
        role: MembershipRole.OWNER,
        accepted: true,
        team: {
          id: 20,
          name: "Team B",
          slug: "team-b",
          isOrganization: false,
          metadata: {},
        },
      },
    ];

    prismaMock.membership.findMany.mockResolvedValue(multipleTeams);

    const result = await getUpgradeableHandler(ctx);

    expect(result).toEqual(multipleTeams);
    expect(result).toHaveLength(2);
  });
});
