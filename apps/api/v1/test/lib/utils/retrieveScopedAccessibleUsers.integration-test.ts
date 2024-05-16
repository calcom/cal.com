import { describe, it, expect } from "vitest";

import prisma from "@calcom/prisma";

import { getAccessibleUsers } from "../../../lib/utils/retrieveScopedAccessibleUsers";

describe("isAdmin guard", () => {
  it("Returns members when admin user ID is supplied", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
    const memberUser = await prisma.user.findFirstOrThrow({ where: { email: "member2-acme@example.com" } });
    const accessibleUserIds = await getAccessibleUsers({
      memberUserIds: [memberUser.id],
      adminUserId: adminUser.id,
    });

    expect(accessibleUserIds.length).toBe(1);
    expect(accessibleUserIds[0]).toBe(memberUser.id);
  });
});
