import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { connectedCalendarsHandler } from "./connectedCalendars.handler";

let user: User;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      timeZone: u.timeZone ?? "UTC",
      defaultScheduleId: u.defaultScheduleId,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      selectedCalendars: [],
      destinationCalendar: null,
      credentials: [],
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
    prisma: prisma as unknown as PrismaClient,
  };
}

describe("calendars.connectedCalendars - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `cal-connected-${timestamp}`,
        email: `cal-connected-${timestamp}@example.com`,
        name: "Connected Calendars Test User",
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

  it("should return empty connected calendars for user with no credentials", async () => {
    const result = await connectedCalendarsHandler({
      ctx: createCtx(user),
      input: {},
    });

    expect(result).toHaveProperty("connectedCalendars");
    expect(result).toHaveProperty("destinationCalendar");
    expect(Array.isArray(result.connectedCalendars)).toBe(true);
    expect(result.connectedCalendars.length).toBe(0);
  });

  it("should support onboarding flag", async () => {
    const result = await connectedCalendarsHandler({
      ctx: createCtx(user),
      input: { onboarding: true },
    });

    expect(result).toHaveProperty("connectedCalendars");
    expect(Array.isArray(result.connectedCalendars)).toBe(true);
  });
});
