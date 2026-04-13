import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resubscribeHandler } from "./resubscribe.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let owner: User;
let member: User;
let nonMember: User;
let team: Team;
let ownerMembership: Membership;
let memberMembership: Membership;

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      uuid: u.uuid,
      email: u.email,
      username: u.username,
      name: u.name,
      identityProvider: u.identityProvider,
      locale: u.locale ?? "en",
      timeZone: u.timeZone ?? "UTC",
      role: u.role,
      completedOnboarding: u.completedOnboarding,
      twoFactorEnabled: u.twoFactorEnabled,
      brandColor: u.brandColor,
      darkBrandColor: u.darkBrandColor,
      theme: u.theme,
      createdDate: u.createdDate,
      avatarUrl: u.avatarUrl,
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

describe("resubscribe.handler - integration", () => {
  beforeAll(async () => {
    owner = await prisma.user.create({
      data: {
        username: `resub-owner-${timestamp}-${unique()}`,
        email: `resub-owner-${timestamp}-${unique()}@example.com`,
        name: "Resub Owner",
      },
    });

    member = await prisma.user.create({
      data: {
        username: `resub-member-${timestamp}-${unique()}`,
        email: `resub-member-${timestamp}-${unique()}@example.com`,
        name: "Resub Member",
      },
    });

    nonMember = await prisma.user.create({
      data: {
        username: `resub-nonmember-${timestamp}-${unique()}`,
        email: `resub-nonmember-${timestamp}-${unique()}@example.com`,
        name: "Resub Non-Member",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Resub Team ${timestamp}`,
        slug: `resub-team-${timestamp}-${unique()}`,
      },
    });

    ownerMembership = await prisma.membership.create({
      data: {
        userId: owner.id,
        teamId: team.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    memberMembership = await prisma.membership.create({
      data: {
        userId: member.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({
        where: { id: { in: [ownerMembership?.id, memberMembership?.id].filter(Boolean) } },
      });
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      const userIds = [owner?.id, member?.id, nonMember?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw FORBIDDEN when non-member tries to resubscribe", async () => {
    await expect(
      resubscribeHandler({
        ctx: createCtx(nonMember),
        input: { teamId: team.id },
      })
    ).rejects.toThrow("You are not a member of this team");
  });

  it("should throw FORBIDDEN when a regular member tries to resubscribe", async () => {
    await expect(
      resubscribeHandler({
        ctx: createCtx(member),
        input: { teamId: team.id },
      })
    ).rejects.toThrow("Only team admins or owners can resubscribe");
  });

  it("should throw when team does not exist", async () => {
    await expect(
      resubscribeHandler({
        ctx: createCtx(owner),
        input: { teamId: 999999 },
      })
    ).rejects.toThrow();
  });
});
