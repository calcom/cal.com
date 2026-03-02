import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getMembersHandler } from "./getMembers.handler";

let orgOwner: User;
let orgMember: User;
let org: Team;
let nonOrgUser: User;
const timestamp = Date.now();

function createCtx(u: User, organizationId: number | null, isPrivate = false) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId,
      organization: organizationId
        ? { id: organizationId, isOrgAdmin: true, metadata: {}, requestedSlug: null, isPrivate }
        : { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null, isPrivate: false },
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

describe("organizations.getMembers - integration", () => {
  beforeAll(async () => {
    orgOwner = await prisma.user.create({
      data: {
        username: `org-members-owner-${timestamp}`,
        email: `org-members-owner-${timestamp}@example.com`,
        name: "Org Members Owner",
      },
    });

    orgMember = await prisma.user.create({
      data: {
        username: `org-members-member-${timestamp}`,
        email: `org-members-member-${timestamp}@example.com`,
        name: "Org Members Member",
      },
    });

    org = await prisma.team.create({
      data: {
        name: `Org Members ${timestamp}`,
        slug: `org-members-${timestamp}`,
        isOrganization: true,
        members: {
          createMany: {
            data: [
              { userId: orgOwner.id, role: MembershipRole.OWNER, accepted: true },
              { userId: orgMember.id, role: MembershipRole.MEMBER, accepted: true },
            ],
          },
        },
      },
    });

    nonOrgUser = await prisma.user.create({
      data: {
        username: `org-members-nonorg-${timestamp}`,
        email: `org-members-nonorg-${timestamp}@example.com`,
        name: "Non Org Members User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({ where: { teamId: org?.id } });
      await prisma.team.deleteMany({ where: { id: org?.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [orgOwner?.id, orgMember?.id, nonOrgUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return empty array for user not in an organization", async () => {
    const result = await getMembersHandler({
      ctx: createCtx(nonOrgUser, null),
      input: { distinctUser: false },
    });

    expect(result).toEqual([]);
  });

  it("should return members for org member", async () => {
    const result = await getMembersHandler({
      ctx: createCtx(orgOwner, org.id),
      input: { distinctUser: false },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("should support accepted filter", async () => {
    const result = await getMembersHandler({
      ctx: createCtx(orgOwner, org.id),
      input: { accepted: true, distinctUser: false },
    });

    expect(Array.isArray(result)).toBe(true);
    result.forEach((member: { accepted: boolean }) => {
      expect(member.accepted).toBe(true);
    });
  });
});
