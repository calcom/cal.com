import { hashPassword } from "@calcom/lib/auth/hashPassword";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { changePasswordHandler } from "./changePassword.handler";

let user: User;
const timestamp = Date.now();
const oldPassword = "OldPassword123!";
const newPassword = "NewPassword456!";

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

describe("auth.changePassword - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `auth-changepw-${timestamp}`,
        email: `auth-changepw-${timestamp}@example.com`,
        name: "ChangePassword Test User",
        identityProvider: IdentityProvider.CAL,
      },
    });

    const hashedPassword = await hashPassword(oldPassword);
    await prisma.userPassword.create({
      data: {
        userId: user.id,
        hash: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.auditEvent.deleteMany({
        where: { actor: { userUuid: user?.uuid } },
      });
      await prisma.auditActor.deleteMany({ where: { userUuid: user?.uuid } });
      await prisma.userPassword.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({
      where: { actor: { userUuid: user?.uuid } },
    });
  });

  it("should change password successfully with correct old password", async () => {
    await expect(
      changePasswordHandler({
        ctx: createCtx(user),
        input: { oldPassword, newPassword },
      })
    ).resolves.toBeUndefined();
  });

  it("should throw when old password is incorrect", async () => {
    await expect(
      changePasswordHandler({
        ctx: createCtx(user),
        input: { oldPassword: "WrongPassword123!", newPassword: "AnotherNew456!" },
      })
    ).rejects.toThrow();
  });

  it("should throw when new password matches old password", async () => {
    await expect(
      changePasswordHandler({
        ctx: createCtx(user),
        input: { oldPassword: newPassword, newPassword },
      })
    ).rejects.toThrow();
  });

  it("should throw when new password is too short", async () => {
    await expect(
      changePasswordHandler({
        ctx: createCtx(user),
        input: { oldPassword: newPassword, newPassword: "short" },
      })
    ).rejects.toThrow();
  });

  it("should persist PASSWORD_CHANGED audit event on success", async () => {
    const currentPassword = newPassword;
    const updatedPassword = "AuditTestPassword789!";

    await changePasswordHandler({
      ctx: createCtx(user),
      input: { oldPassword: currentPassword, newPassword: updatedPassword },
    });

    // emitAuditEvent is fire-and-forget — poll until the write completes
    await vi.waitFor(async () => {
      const auditEvent = await prisma.auditEvent.findFirst({
        where: { actor: { userUuid: user.uuid }, action: "PASSWORD_CHANGED" },
        orderBy: { createdAt: "desc" },
      });

      expect(auditEvent).toBeDefined();
      expect(auditEvent?.action).toBe("PASSWORD_CHANGED");
      expect(auditEvent?.category).toBe("SECURITY");
      expect(auditEvent?.source).toBe("WEBAPP");
      expect(auditEvent?.targetType).toBe("user");
      expect(auditEvent?.targetId).toBe(user.uuid);
    });
  });

  it("should not persist audit event when password change fails", async () => {
    const countBefore = await prisma.auditEvent.count({
      where: { actor: { userUuid: user.uuid }, action: "PASSWORD_CHANGED" },
    });

    await expect(
      changePasswordHandler({
        ctx: createCtx(user),
        input: { oldPassword: "WrongPassword!", newPassword: "DoesNotMatter123!" },
      })
    ).rejects.toThrow();

    // Small delay to ensure any fire-and-forget would have completed
    await new Promise((r) => setTimeout(r, 200));

    const countAfter = await prisma.auditEvent.count({
      where: { actor: { userUuid: user.uuid }, action: "PASSWORD_CHANGED" },
    });

    expect(countAfter).toBe(countBefore);
  });
});
