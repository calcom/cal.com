import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listInvoicesHandler } from "./listInvoices.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let admin: User;
let member: User;
let team: Team;
let adminMembership: Membership;
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

describe("listInvoices.handler - integration", () => {
  beforeAll(async () => {
    admin = await prisma.user.create({
      data: {
        username: `invoice-admin-${timestamp}-${unique()}`,
        email: `invoice-admin-${timestamp}-${unique()}@example.com`,
        name: "Invoice Admin",
      },
    });

    member = await prisma.user.create({
      data: {
        username: `invoice-member-${timestamp}-${unique()}`,
        email: `invoice-member-${timestamp}-${unique()}@example.com`,
        name: "Invoice Member",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Invoice Team ${timestamp}`,
        slug: `invoice-team-${timestamp}-${unique()}`,
      },
    });

    adminMembership = await prisma.membership.create({
      data: {
        userId: admin.id,
        teamId: team.id,
        role: MembershipRole.ADMIN,
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
        where: { id: { in: [adminMembership?.id, memberMembership?.id].filter(Boolean) } },
      });
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      const userIds = [admin?.id, member?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return empty invoices when team billing is not enabled", async () => {
    const result = await listInvoicesHandler({
      ctx: createCtx(admin),
      input: { teamId: team.id, limit: 10 },
    });

    expect(result).toBeDefined();
    expect(result.invoices).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("should return empty invoices for non-admin when billing is disabled", async () => {
    const result = await listInvoicesHandler({
      ctx: createCtx(member),
      input: { teamId: team.id, limit: 10 },
    });

    expect(result).toBeDefined();
    expect(result.invoices).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("should return empty invoices for nonexistent team when billing is disabled", async () => {
    const result = await listInvoicesHandler({
      ctx: createCtx(admin),
      input: { teamId: 999999, limit: 10 },
    });

    expect(result).toBeDefined();
    expect(result.invoices).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});
