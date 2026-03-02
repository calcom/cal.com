import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkForGCalHandler } from "./checkForGCal.handler";

let user: User;
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

describe("apps.checkForGCal - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `apps-gcal-${timestamp}`,
        email: `apps-gcal-${timestamp}@example.com`,
        name: "GCal Check Test User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.credential.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return false when user has no google calendar credential", async () => {
    const result = await checkForGCalHandler({
      ctx: createCtx(user),
    });

    expect(result).toBe(false);
  });

  it("should return true when user has google calendar credential", async () => {
    await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {},
        userId: user.id,
      },
    });

    const result = await checkForGCalHandler({
      ctx: createCtx(user),
    });

    expect(result).toBe(true);
  });
});
