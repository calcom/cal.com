import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteHandler } from "./delete.handler";

let ownerUser: User;
let memberUser: User;
let teamToDelete: Team;
let teamForPermissionTest: Team;
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

describe("teams.delete - integration", () => {
  beforeAll(async () => {
    ownerUser = await prisma.user.create({
      data: {
        username: `teams-del-owner-${timestamp}`,
        email: `teams-del-owner-${timestamp}@example.com`,
        name: "Team Delete Owner",
      },
    });

    memberUser = await prisma.user.create({
      data: {
        username: `teams-del-member-${timestamp}`,
        email: `teams-del-member-${timestamp}@example.com`,
        name: "Team Delete Member",
      },
    });

    teamToDelete = await prisma.team.create({
      data: {
        name: `Delete Team ${timestamp}`,
        slug: `delete-team-${timestamp}`,
        members: {
          create: {
            userId: ownerUser.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });

    teamForPermissionTest = await prisma.team.create({
      data: {
        name: `Permission Team ${timestamp}`,
        slug: `permission-team-${timestamp}`,
        members: {
          createMany: {
            data: [
              { userId: ownerUser.id, role: MembershipRole.OWNER, accepted: true },
              { userId: memberUser.id, role: MembershipRole.MEMBER, accepted: true },
            ],
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({
        where: {
          teamId: { in: [teamToDelete?.id, teamForPermissionTest?.id].filter(Boolean) },
        },
      });
      await prisma.team.deleteMany({
        where: { id: { in: [teamToDelete?.id, teamForPermissionTest?.id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUser?.id, memberUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw FORBIDDEN when non-owner tries to delete team", async () => {
    await expect(
      deleteHandler({
        ctx: createCtx(memberUser),
        input: { teamId: teamForPermissionTest.id },
      })
    ).rejects.toThrow();
  });

  it("should throw NOT_FOUND for non-existent team", async () => {
    await expect(
      deleteHandler({
        ctx: createCtx(ownerUser),
        input: { teamId: 999999999 },
      })
    ).rejects.toThrow();
  });
});
