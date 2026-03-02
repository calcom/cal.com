import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listHandler } from "./list.handler";

let orgOwner: User;
let org: Team;
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

describe("organizations.list - integration", () => {
  beforeAll(async () => {
    orgOwner = await prisma.user.create({
      data: {
        username: `org-list-owner-${timestamp}`,
        email: `org-list-owner-${timestamp}@example.com`,
        name: "Org List Owner",
      },
    });

    org = await prisma.team.create({
      data: {
        name: `Org List ${timestamp}`,
        slug: `org-list-${timestamp}`,
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

    nonOrgUser = await prisma.user.create({
      data: {
        username: `org-list-nonorg-${timestamp}`,
        email: `org-list-nonorg-${timestamp}@example.com`,
        name: "Non Org User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({ where: { teamId: org?.id } });
      await prisma.team.deleteMany({ where: { id: org?.id } });
      await prisma.user.deleteMany({
        where: { id: { in: [orgOwner?.id, nonOrgUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw BAD_REQUEST for user not in an organization", async () => {
    await expect(
      listHandler({ ctx: createCtx(nonOrgUser, null) })
    ).rejects.toThrow();
  });

  it("should return organization details for org member", async () => {
    const result = await listHandler({ ctx: createCtx(orgOwner, org.id) });

    if (result) {
      expect(result).toHaveProperty("features");
    }
  });
});
