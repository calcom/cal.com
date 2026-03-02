import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listHandler } from "./list.handler";

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
    prisma: prisma as unknown as PrismaClient,
  };
}

describe("workflows.list - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `wf-list-${timestamp}`,
        email: `wf-list-${timestamp}@example.com`,
        name: "Workflow List Test User",
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.workflow.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return workflows for user with userId filter", async () => {
    const result = await listHandler({
      ctx: createCtx(user),
      input: { userId: user.id, includeOnlyEventTypeWorkflows: false },
    });

    expect(result).toHaveProperty("workflows");
    expect(Array.isArray(result.workflows)).toBe(true);
  });

  it("should return empty workflows for user with no workflows", async () => {
    const emptyUser = await prisma.user.create({
      data: {
        username: `wf-list-empty-${timestamp}`,
        email: `wf-list-empty-${timestamp}@example.com`,
        name: "Empty Workflow User",
      },
    });

    try {
      const result = await listHandler({
        ctx: createCtx(emptyUser),
        input: { userId: emptyUser.id, includeOnlyEventTypeWorkflows: false },
      });

      expect(result.workflows).toEqual([]);
    } finally {
      await prisma.user.deleteMany({ where: { id: emptyUser.id } });
    }
  });
});
