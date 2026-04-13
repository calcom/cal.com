import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { switchBillingPeriodHandler } from "./switchBillingPeriod.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let owner: User;
let member: User;
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

describe("switchBillingPeriod.handler - integration", () => {
  beforeAll(async () => {
    owner = await prisma.user.create({
      data: {
        username: `billing-owner-${timestamp}-${unique()}`,
        email: `billing-owner-${timestamp}-${unique()}@example.com`,
        name: "Billing Owner",
      },
    });

    member = await prisma.user.create({
      data: {
        username: `billing-member-${timestamp}-${unique()}`,
        email: `billing-member-${timestamp}-${unique()}@example.com`,
        name: "Billing Member",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Billing Team ${timestamp}`,
        slug: `billing-team-${timestamp}-${unique()}`,
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
      const userIds = [owner?.id, member?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw BAD_REQUEST for any user when team billing is not enabled (guard fires before role check)", async () => {
    await expect(
      switchBillingPeriodHandler({
        ctx: createCtx(member),
        input: { teamId: team.id, targetPeriod: "ANNUALLY" },
      })
    ).rejects.toThrow("Team billing is not enabled");
  });

  it("should throw BAD_REQUEST when team billing is not enabled even for owner", async () => {
    await expect(
      switchBillingPeriodHandler({
        ctx: createCtx(owner),
        input: { teamId: team.id, targetPeriod: "ANNUALLY" },
      })
    ).rejects.toThrow("Team billing is not enabled");
  });

  it("should throw when nonexistent team is provided (billing guard fires first when disabled)", async () => {
    await expect(
      switchBillingPeriodHandler({
        ctx: createCtx(owner),
        input: { teamId: 999999, targetPeriod: "ANNUALLY" },
      })
    ).rejects.toThrow("Team billing is not enabled");
  });
});
