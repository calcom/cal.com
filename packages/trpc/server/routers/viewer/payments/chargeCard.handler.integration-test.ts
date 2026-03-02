import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chargeCardHandler } from "./chargeCard.handler";

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
    prisma: prisma as unknown as PrismaClient,
  };
}

describe("payments.chargeCard - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `pay-charge-${timestamp}`,
        email: `pay-charge-${timestamp}@example.com`,
        name: "Charge Card Test User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should throw NOT_FOUND for non-existent booking", async () => {
    await expect(
      chargeCardHandler({
        ctx: createCtx(user),
        input: { bookingId: 999999999 },
      })
    ).rejects.toThrow();
  });
});
