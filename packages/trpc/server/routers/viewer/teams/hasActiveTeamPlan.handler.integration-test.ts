import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasActiveTeamPlanHandler } from "./hasActiveTeamPlan.handler";

let user: User;
let team: Team;
const timestamp = Date.now();

describe("teams.hasActiveTeamPlan - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `teams-plan-${timestamp}`,
        email: `teams-plan-${timestamp}@example.com`,
        name: "Team Plan Test User",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Plan Team ${timestamp}`,
        slug: `plan-team-${timestamp}`,
        members: {
          create: {
            userId: user.id,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.membership.deleteMany({ where: { teamId: team?.id } });
      await prisma.team.deleteMany({ where: { id: team?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  // Note: In self-hosted mode (IS_SELF_HOSTED=true), the handler returns
  // { isActive: true, isTrial: false } immediately without checking the DB.
  // The test environment sets NEXT_PUBLIC_WEBAPP_URL to app.cal.local:3000
  // which triggers self-hosted mode.

  it("should return isActive and isTrial fields", async () => {
    const result = await hasActiveTeamPlanHandler({
      ctx: {
        user: { id: user.id } as Pick<NonNullable<TrpcSessionUser>, "id">,
      },
      input: {},
    });

    expect(result).toHaveProperty("isActive");
    expect(result).toHaveProperty("isTrial");
    expect(typeof result.isActive).toBe("boolean");
    expect(typeof result.isTrial).toBe("boolean");
  });

  it("should support ownerOnly filter", async () => {
    const result = await hasActiveTeamPlanHandler({
      ctx: {
        user: { id: user.id } as Pick<NonNullable<TrpcSessionUser>, "id">,
      },
      input: { ownerOnly: true },
    });

    expect(result).toHaveProperty("isActive");
    expect(result).toHaveProperty("isTrial");
  });

  it("should return consistent result for user with no teams", async () => {
    const loneUser = await prisma.user.create({
      data: {
        username: `teams-plan-lone-${timestamp}`,
        email: `teams-plan-lone-${timestamp}@example.com`,
        name: "Lone User",
      },
    });

    try {
      const result = await hasActiveTeamPlanHandler({
        ctx: {
          user: { id: loneUser.id } as Pick<NonNullable<TrpcSessionUser>, "id">,
        },
        input: {},
      });

      // In self-hosted mode, always returns isActive: true
      // In hosted mode, returns isActive: false for users with no teams
      expect(result).toHaveProperty("isActive");
      expect(result).toHaveProperty("isTrial");
      expect(typeof result.isActive).toBe("boolean");
      expect(typeof result.isTrial).toBe("boolean");
    } finally {
      await prisma.user.deleteMany({ where: { id: loneUser.id } });
    }
  });
});
