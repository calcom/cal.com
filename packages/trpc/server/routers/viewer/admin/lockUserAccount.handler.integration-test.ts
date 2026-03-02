import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock sendEmailVerification to avoid email side effects
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendEmailVerification: vi.fn(() => Promise.resolve()),
}));

import lockUserAccountHandler from "./lockUserAccount.handler";

let adminUser: User;
let targetUser: User;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
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

describe("admin.lockUserAccount - integration", () => {
  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        username: `admin-lock-${timestamp}`,
        email: `admin-lock-${timestamp}@example.com`,
        name: "Admin Lock Test User",
        role: UserPermissionRole.ADMIN,
      },
    });

    targetUser = await prisma.user.create({
      data: {
        username: `admin-lock-target-${timestamp}`,
        email: `admin-lock-target-${timestamp}@example.com`,
        name: "Lock Target User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [adminUser?.id, targetUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should lock a user account", async () => {
    const result = await lockUserAccountHandler({
      ctx: createCtx(adminUser),
      input: { userId: targetUser.id, locked: true },
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(targetUser.id);
    expect(result.locked).toBe(true);

    // Verify the user was actually locked in the database (include locked: true to bypass excludeLockedUsersExtension)
    const lockedUser = await prisma.user.findUnique({
      where: { id: targetUser.id, locked: true },
      select: { id: true, locked: true },
    });
    expect(lockedUser).not.toBeNull();
    expect(lockedUser!.locked).toBe(true);
  });

  it("should unlock a user account", async () => {
    const result = await lockUserAccountHandler({
      ctx: createCtx(adminUser),
      input: { userId: targetUser.id, locked: false },
    });

    expect(result.success).toBe(true);
    expect(result.locked).toBe(false);

    const unlockedUser = await prisma.user.findUnique({
      where: { id: targetUser.id, locked: false },
      select: { id: true, locked: true },
    });
    expect(unlockedUser).not.toBeNull();
    expect(unlockedUser!.locked).toBe(false);
  });

  it("should throw for non-existent user", async () => {
    await expect(
      lockUserAccountHandler({
        ctx: createCtx(adminUser),
        input: { userId: 999999999, locked: true },
      })
    ).rejects.toThrow();
  });
});
