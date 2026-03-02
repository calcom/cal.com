import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listMembersHandler } from "./listMembers.handler";

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
      locale: u.locale ?? "en",
      timeZone: u.timeZone ?? "UTC",
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
      profiles: [],
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("teams.listMembers - integration", () => {
  beforeAll(async () => {
    ownerUser = await prisma.user.create({
      data: {
        username: `teams-lm-owner-${timestamp}`,
        email: `teams-lm-owner-${timestamp}@example.com`,
        name: "List Members Owner",
      },
    });

    memberUser = await prisma.user.create({
      data: {
        username: `teams-lm-member-${timestamp}`,
        email: `teams-lm-member-${timestamp}@example.com`,
        name: "List Members Member",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `ListMembers Team ${timestamp}`,
        slug: `listmembers-team-${timestamp}`,
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

  it("should list members of the team with pagination metadata", async () => {
    const result = await listMembersHandler({
      ctx: createCtx(ownerUser),
      input: { teamId: team.id, limit: 10 },
    });

    expect(result.members).toBeDefined();
    expect(result.members.length).toBeGreaterThanOrEqual(2);
    expect(result.meta.totalRowCount).toBeGreaterThanOrEqual(2);
  });

  it("should support search filtering", async () => {
    const result = await listMembersHandler({
      ctx: createCtx(ownerUser),
      input: { teamId: team.id, limit: 10, searchTerm: "List Members Member" },
    });

    expect(result.members.length).toBe(1);
    expect(result.members[0].email).toBe(memberUser.email);
  });

  it("should throw UNAUTHORIZED for non-member trying to list members", async () => {
    const outsideUser = await prisma.user.create({
      data: {
        username: `teams-lm-outside-${timestamp}`,
        email: `teams-lm-outside-${timestamp}@example.com`,
        name: "Outside User",
      },
    });

    try {
      await expect(
        listMembersHandler({
          ctx: createCtx(outsideUser),
          input: { teamId: team.id, limit: 10 },
        })
      ).rejects.toThrow();
    } finally {
      await prisma.user.deleteMany({ where: { id: outsideUser.id } });
    }
  });
});
