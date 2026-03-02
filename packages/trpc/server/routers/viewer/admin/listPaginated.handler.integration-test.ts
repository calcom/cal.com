import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import listPaginatedHandler from "./listPaginated.handler";

let adminUser: User;
let regularUser: User;
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

describe("admin.listPaginated - integration", () => {
  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        username: `admin-list-${timestamp}`,
        email: `admin-list-${timestamp}@example.com`,
        name: "Admin List Test User",
        role: UserPermissionRole.ADMIN,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        username: `admin-list-regular-${timestamp}`,
        email: `admin-list-regular-${timestamp}@example.com`,
        name: "Regular User for Admin List",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [adminUser?.id, regularUser?.id].filter(Boolean) } },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return paginated users with metadata", async () => {
    const result = await listPaginatedHandler({
      ctx: createCtx(adminUser),
      input: { limit: 10 },
    });

    expect(result.rows).toBeDefined();
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.meta.totalRowCount).toBeGreaterThan(0);
  });

  it("should support search filtering by email", async () => {
    const result = await listPaginatedHandler({
      ctx: createCtx(adminUser),
      input: { limit: 10, searchTerm: `admin-list-regular-${timestamp}` },
    });

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const emails = result.rows.map((r: { email: string }) => r.email);
    expect(emails).toContain(regularUser.email);
  });

  it("should support cursor-based pagination", async () => {
    const firstPage = await listPaginatedHandler({
      ctx: createCtx(adminUser),
      input: { limit: 1 },
    });

    expect(firstPage.rows.length).toBe(1);

    if (firstPage.nextCursor) {
      const secondPage = await listPaginatedHandler({
        ctx: createCtx(adminUser),
        input: { limit: 1, cursor: firstPage.nextCursor },
      });

      expect(secondPage.rows.length).toBeGreaterThanOrEqual(0);
      if (secondPage.rows.length > 0) {
        expect(secondPage.rows[0].id).not.toBe(firstPage.rows[0].id);
      }
    }
  });
});
