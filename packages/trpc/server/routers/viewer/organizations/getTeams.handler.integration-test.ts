import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTeamsHandler } from "./getTeams.handler";

let orgOwner: User;
let org: Team;
let childTeam: Team;
let nonOrgUser: User;
const timestamp = Date.now();

function createCtx(u: User, organizationId: number | null) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId,
      organization: organizationId
        ? { id: organizationId, isOrgAdmin: true, metadata: {}, requestedSlug: null, isPrivate: false }
        : { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profiles: organizationId
        ? [{ id: u.id, upId: `usr-${u.id}`, username: u.username ?? "", userId: u.id, organizationId, organization: null }]
        : [],
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("organizations.getTeams - integration", () => {
  beforeAll(async () => {
    orgOwner = await prisma.user.create({
      data: {
        username: `org-getteams-owner-${timestamp}`,
        email: `org-getteams-owner-${timestamp}@example.com`,
        name: "Org GetTeams Owner",
      },
    });

    org = await prisma.team.create({
      data: {
        name: `Org GetTeams ${timestamp}`,
        slug: `org-getteams-${timestamp}`,
        isOrganization: true,
        members: {
          create: {
            userId: orgOwner.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });

    childTeam = await prisma.team.create({
      data: {
        name: `Child Team ${timestamp}`,
        slug: `child-team-${timestamp}`,
        parentId: org.id,
        members: {
          create: {
            userId: orgOwner.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });

    nonOrgUser = await prisma.user.create({
      data: {
        username: `org-getteams-nonorg-${timestamp}`,
        email: `org-getteams-nonorg-${timestamp}@example.com`,
        name: "Non Org GetTeams User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({
        where: { teamId: { in: [org?.id, childTeam?.id].filter(Boolean) } },
      });
      await prisma.team.deleteMany({
        where: { id: { in: [childTeam?.id, org?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [orgOwner?.id, nonOrgUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw UNAUTHORIZED for user not in an organization", async () => {
    await expect(
      getTeamsHandler({ ctx: createCtx(nonOrgUser, null) })
    ).rejects.toThrow();
  });

  it("should return teams within the organization", async () => {
    const result = await getTeamsHandler({ ctx: createCtx(orgOwner, org.id) });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);

    const teamNames = result.map((t: { name: string }) => t.name);
    expect(teamNames).toContain(`Child Team ${timestamp}`);
  });
});
