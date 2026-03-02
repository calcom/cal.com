import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listHandler } from "./list.handler";

let user: User;
let team1: Team;
let team2: Team;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("teams.list - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `teams-list-${timestamp}`,
        email: `teams-list-${timestamp}@example.com`,
        name: "Teams List Test User",
      },
    });

    team1 = await prisma.team.create({
      data: {
        name: `List Team 1 ${timestamp}`,
        slug: `list-team-1-${timestamp}`,
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });

    team2 = await prisma.team.create({
      data: {
        name: `List Team 2 ${timestamp}`,
        slug: `list-team-2-${timestamp}`,
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.MEMBER,
            accepted: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({
        where: { teamId: { in: [team1?.id, team2?.id].filter(Boolean) } },
      });
      await prisma.team.deleteMany({
        where: { id: { in: [team1?.id, team2?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should list all teams for the user", async () => {
    const result = await listHandler({
      ctx: createCtx(user),
      input: {},
    });

    expect(Array.isArray(result)).toBe(true);
    const teamIds = result.map((t: { id: number }) => t.id);
    expect(teamIds).toContain(team1.id);
    expect(teamIds).toContain(team2.id);
  });

  it("should return empty for user with no teams", async () => {
    const loneUser = await prisma.user.create({
      data: {
        username: `teams-list-lone-${timestamp}`,
        email: `teams-list-lone-${timestamp}@example.com`,
        name: "Lone User",
      },
    });

    try {
      const result = await listHandler({
        ctx: createCtx(loneUser),
        input: {},
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    } finally {
      await prisma.user.deleteMany({ where: { id: loneUser.id } });
    }
  });
});
