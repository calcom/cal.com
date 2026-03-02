import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { get as getHandler } from "./get.handler";

let user: User;
let otherUser: User;
let team: Team;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null, isPrivate: false },
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

describe("teams.get - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `teams-get-${timestamp}`,
        email: `teams-get-${timestamp}@example.com`,
        name: "Teams Get Test User",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        username: `teams-get-other-${timestamp}`,
        email: `teams-get-other-${timestamp}@example.com`,
        name: "Other User",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Get Team ${timestamp}`,
        slug: `get-team-${timestamp}`,
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({ where: { teamId: team?.id } });
      await prisma.team.deleteMany({ where: { id: team?.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [user?.id, otherUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return team details for a member", async () => {
    const result = await getHandler({
      ctx: createCtx(user),
      input: { teamId: team.id },
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(team.id);
    expect(result.name).toBe(team.name);
    expect(result.membership).toBeDefined();
    expect(result.membership.role).toBe(MembershipRole.OWNER);
  });

  it("should throw UNAUTHORIZED for non-member", async () => {
    await expect(
      getHandler({
        ctx: createCtx(otherUser),
        input: { teamId: team.id },
      })
    ).rejects.toThrow();
  });
});
