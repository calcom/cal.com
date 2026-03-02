import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteTeamHandler } from "./deleteTeam.handler";

let orgOwner: User;
let org: Team;
let teamToDelete: Team;
let standaloneTeam: Team;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId: org?.id ?? null,
      organization: org
        ? { id: org.id, isOrgAdmin: true, metadata: {}, requestedSlug: null, isPrivate: false }
        : { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profiles: org
        ? [{ id: u.id, upId: `usr-${u.id}`, username: u.username ?? "", userId: u.id, organizationId: org.id, organization: null }]
        : [],
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: org?.id ?? null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("organizations.deleteTeam - integration", () => {
  beforeAll(async () => {
    orgOwner = await prisma.user.create({
      data: {
        username: `org-delteam-owner-${timestamp}`,
        email: `org-delteam-owner-${timestamp}@example.com`,
        name: "Org DeleteTeam Owner",
      },
    });

    org = await prisma.team.create({
      data: {
        name: `Org DeleteTeam ${timestamp}`,
        slug: `org-delteam-${timestamp}`,
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

    teamToDelete = await prisma.team.create({
      data: {
        name: `Team To Delete ${timestamp}`,
        slug: `team-to-delete-${timestamp}`,
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

    standaloneTeam = await prisma.team.create({
      data: {
        name: `Standalone Team ${timestamp}`,
        slug: `standalone-team-${timestamp}`,
        members: {
          create: {
            userId: orgOwner.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({
        where: { teamId: { in: [org?.id, teamToDelete?.id, standaloneTeam?.id].filter(Boolean) } },
      });
      await prisma.team.deleteMany({
        where: { id: { in: [teamToDelete?.id, standaloneTeam?.id, org?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({ where: { id: orgOwner?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw NOT_FOUND for non-existent team", async () => {
    await expect(
      deleteTeamHandler({
        ctx: createCtx(orgOwner),
        input: { teamId: 999999999 },
      })
    ).rejects.toThrow();
  });

  it("should throw BAD_REQUEST for standalone team (no parentId)", async () => {
    await expect(
      deleteTeamHandler({
        ctx: createCtx(orgOwner),
        input: { teamId: standaloneTeam.id },
      })
    ).rejects.toThrow();
  });

  it("should delete a team within the organization", async () => {
    await deleteTeamHandler({
      ctx: createCtx(orgOwner),
      input: { teamId: teamToDelete.id },
    });

    const deleted = await prisma.team.findUnique({ where: { id: teamToDelete.id } });
    expect(deleted).toBeNull();
  });
});
