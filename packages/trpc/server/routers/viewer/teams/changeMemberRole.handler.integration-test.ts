import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { changeMemberRoleHandler } from "./changeMemberRole.handler";

let ownerUser: User;
let memberUser: User;
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

describe("teams.changeMemberRole - integration", () => {
  beforeAll(async () => {
    ownerUser = await prisma.user.create({
      data: {
        username: `teams-role-owner-${timestamp}`,
        email: `teams-role-owner-${timestamp}@example.com`,
        name: "Role Owner",
      },
    });

    memberUser = await prisma.user.create({
      data: {
        username: `teams-role-member-${timestamp}`,
        email: `teams-role-member-${timestamp}@example.com`,
        name: "Role Member",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Role Team ${timestamp}`,
        slug: `role-team-${timestamp}`,
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
      await prisma.membership.deleteMany({ where: { teamId: team?.id } });
      await prisma.team.deleteMany({ where: { id: team?.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUser?.id, memberUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw NOT_FOUND for non-existent team", async () => {
    await expect(
      changeMemberRoleHandler({
        ctx: createCtx(ownerUser),
        input: { teamId: 999999999, memberId: memberUser.id, role: MembershipRole.ADMIN },
      })
    ).rejects.toThrow();
  });

  it("should throw UNAUTHORIZED when member tries to change roles", async () => {
    await expect(
      changeMemberRoleHandler({
        ctx: createCtx(memberUser),
        input: { teamId: team.id, memberId: ownerUser.id, role: MembershipRole.MEMBER },
      })
    ).rejects.toThrow();
  });
});
