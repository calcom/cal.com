import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock getLocalAppMetadata to provide app metadata without reading actual app-store files
vi.mock("@calcom/app-store/utils", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@calcom/app-store/utils");
  return {
    ...actual,
    getLocalAppMetadata: vi.fn(() => [
      {
        slug: "test-app-toggle",
        dirName: "test-app-toggle",
        categories: ["other"],
        type: "test-app-toggle_other",
      },
    ]),
  };
});

// Mock sendDisabledAppEmail to avoid email side effects
vi.mock("@calcom/emails/integration-email-service", () => ({
  sendDisabledAppEmail: vi.fn(() => Promise.resolve()),
}));

import { toggleHandler } from "./toggle.handler";

let adminUser: User;
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
    prisma: prisma as unknown as PrismaClient,
  };
}

describe("apps.toggle - integration", () => {
  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        username: `apps-toggle-${timestamp}`,
        email: `apps-toggle-${timestamp}@example.com`,
        name: "Toggle Test Admin",
        role: UserPermissionRole.ADMIN,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.app.deleteMany({
        where: { slug: "test-app-toggle" },
      });
      await prisma.user.deleteMany({ where: { id: adminUser?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should enable an app", async () => {
    const result = await toggleHandler({
      ctx: createCtx(adminUser),
      input: { slug: "test-app-toggle", enabled: true },
    });

    expect(result).toBe(true);

    const app = await prisma.app.findUnique({ where: { slug: "test-app-toggle" } });
    expect(app?.enabled).toBe(true);
  });

  it("should disable an app", async () => {
    const result = await toggleHandler({
      ctx: createCtx(adminUser),
      input: { slug: "test-app-toggle", enabled: false },
    });

    expect(result).toBe(false);

    const app = await prisma.app.findUnique({ where: { slug: "test-app-toggle" } });
    expect(app?.enabled).toBe(false);
  });

  it("should throw for unknown app slug", async () => {
    await expect(
      toggleHandler({
        ctx: createCtx(adminUser),
        input: { slug: `nonexistent-app-${timestamp}`, enabled: true },
      })
    ).rejects.toThrow();
  });
});
