import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: { findMany: vi.fn() },
  },
}));

vi.mock("@calcom/prisma/enums", () => ({
  MembershipRole: {
    ADMIN: "ADMIN",
    OWNER: "OWNER",
    MEMBER: "MEMBER",
  },
}));

import { prisma } from "@calcom/prisma";
import { hasEditPermissionForUserID, hasReadPermissionsForUserId } from "./hasEditPermissionForUser";

describe("hasEditPermissionForUserID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when users share a team and authed user is ADMIN", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10, role: "ADMIN" }] as never)
      .mockResolvedValueOnce([{ teamId: 10, role: "MEMBER" }] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(true);
  });

  it("returns true when users share a team and authed user is OWNER", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10, role: "OWNER" }] as never)
      .mockResolvedValueOnce([{ teamId: 10, role: "MEMBER" }] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(true);
  });

  it("returns false when users share a team but authed user is MEMBER", async () => {
    // MEMBER role is filtered out by the query (role: { in: [ADMIN, OWNER] })
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ teamId: 10 }] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(false);
  });

  it("returns false when users are in different teams", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10 }] as never)
      .mockResolvedValueOnce([{ teamId: 20 }] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(false);
  });

  it("returns false when authed user has no teams", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ teamId: 10 }] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(false);
  });

  it("returns false when target user has no teams", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10 }] as never)
      .mockResolvedValueOnce([] as never);

    const result = await hasEditPermissionForUserID({
      ctx: { user: { id: 1 } },
      input: { memberId: 2 },
    });
    expect(result).toBe(false);
  });
});

describe("hasReadPermissionsForUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when users share any team", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10 }] as never)
      .mockResolvedValueOnce([{ teamId: 10 }] as never);

    const result = await hasReadPermissionsForUserId({ userId: 1, memberId: 2 });
    expect(result).toBe(true);
  });

  it("returns false when users are in different teams", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10 }] as never)
      .mockResolvedValueOnce([{ teamId: 20 }] as never);

    const result = await hasReadPermissionsForUserId({ userId: 1, memberId: 2 });
    expect(result).toBe(false);
  });

  it("returns true regardless of role", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([{ teamId: 10, role: "MEMBER" }] as never)
      .mockResolvedValueOnce([{ teamId: 10, role: "MEMBER" }] as never);

    const result = await hasReadPermissionsForUserId({ userId: 1, memberId: 2 });
    expect(result).toBe(true);
  });

  it("returns false when neither user has teams", async () => {
    vi.mocked(prisma.membership.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const result = await hasReadPermissionsForUserId({ userId: 1, memberId: 2 });
    expect(result).toBe(false);
  });
});
