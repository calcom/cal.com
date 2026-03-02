import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { updateProfileHandler } from "./updateProfile.handler";

let user: User;
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
      metadata: u.metadata ?? {},
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      defaultScheduleId: u.defaultScheduleId,
      emailVerified: u.emailVerified,
      movedToProfileId: null,
      profiles: [],
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

describe("me.updateProfile - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `me-profile-${timestamp}`,
        email: `me-profile-${timestamp}@example.com`,
        name: "Profile Update Test User",
        timeZone: "UTC",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.schedule.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should update user name", async () => {
    const result = await updateProfileHandler({
      ctx: createCtx(user),
      input: { name: `Updated Name ${timestamp}` },
    });

    expect(result.name).toBe(`Updated Name ${timestamp}`);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.name).toBe(`Updated Name ${timestamp}`);
  });

  it("should update user timeZone", async () => {
    const result = await updateProfileHandler({
      ctx: createCtx(user),
      input: { timeZone: "America/New_York" },
    });

    expect(result.timeZone).toBe("America/New_York");
  });

  it("should update user locale", async () => {
    const result = await updateProfileHandler({
      ctx: createCtx(user),
      input: { locale: "fr" },
    });

    expect(result.locale).toBe("fr");
  });

  it("should update user theme", async () => {
    const result = await updateProfileHandler({
      ctx: createCtx(user),
      input: { theme: "dark" },
    });

    expect(result.theme).toBe("dark");
  });
});
