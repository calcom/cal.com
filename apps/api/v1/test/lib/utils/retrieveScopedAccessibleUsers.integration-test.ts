import { describe, it, expect, beforeAll } from "vitest";

import prisma from "@calcom/prisma";

import {
  getAccessibleUsers,
  retrieveOrgScopedAccessibleUsers,
} from "../../../lib/utils/retrieveScopedAccessibleUsers";

describe("retrieveScopedAccessibleUsers tests", () => {
  beforeAll(async () => {
    const acmeOrg = await prisma.team.findFirst({
      where: {
        slug: "acme",
        isOrganization: true,
      },
    });

    if (acmeOrg) {
      await prisma.organizationSettings.upsert({
        where: {
          organizationId: acmeOrg.id,
        },
        update: {
          isAdminAPIEnabled: true,
        },
        create: {
          organizationId: acmeOrg.id,
          orgAutoAcceptEmail: "acme.com",
          isAdminAPIEnabled: true,
        },
      });
    }
  });
  describe("getAccessibleUsers", () => {
    it("Does not return members when only admin user ID is supplied", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const accessibleUserIds = await getAccessibleUsers({
        memberUserIds: [],
        adminUserId: adminUser.id,
      });

      expect(accessibleUserIds.length).toBe(0);
    });

    it("Does not return members when admin user ID is not an admin of the user", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-dunder@example.com" } });
      const memberOneUser = await prisma.user.findFirstOrThrow({
        where: { email: "member1-acme@example.com" },
      });
      const accessibleUserIds = await getAccessibleUsers({
        memberUserIds: [memberOneUser.id],
        adminUserId: adminUser.id,
      });

      expect(accessibleUserIds.length).toBe(0);
    });

    it("Returns members when admin user ID is supplied and members IDs are supplied", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "owner1-acme@example.com" } });
      const memberOneUser = await prisma.user.findFirstOrThrow({
        where: { email: "member1-acme@example.com" },
      });
      const memberTwoUser = await prisma.user.findFirstOrThrow({
        where: { email: "member2-acme@example.com" },
      });
      const accessibleUserIds = await getAccessibleUsers({
        memberUserIds: [memberOneUser.id, memberTwoUser.id],
        adminUserId: adminUser.id,
      });

      expect(accessibleUserIds.length).toBe(2);
      expect(accessibleUserIds).toContain(memberOneUser.id);
      expect(accessibleUserIds).toContain(memberTwoUser.id);
    });
  });

  describe("retrieveOrgScopedAccessibleUsers", () => {
    it("Does not return members when admin user ID is an admin of an org", async () => {
      const memberOneUser = await prisma.user.findFirstOrThrow({
        where: { email: "member1-acme@example.com" },
      });

      const accessibleUserIds = await retrieveOrgScopedAccessibleUsers({
        adminId: memberOneUser.id,
      });

      expect(accessibleUserIds.length).toBe(0);
    });

    it("Returns members when admin user ID is an admin of an org", async () => {
      const adminUser = await prisma.user.findFirstOrThrow({
        where: { email: "owner1-acme@example.com" },
      });

      const accessibleUserIds = await retrieveOrgScopedAccessibleUsers({
        adminId: adminUser.id,
      });

      const memberOneUser = await prisma.user.findFirstOrThrow({
        where: { email: "member1-acme@example.com" },
      });

      const memberTwoUser = await prisma.user.findFirstOrThrow({
        where: { email: "member2-acme@example.com" },
      });

      expect(accessibleUserIds.length).toBe(11);
      expect(accessibleUserIds).toContain(memberOneUser.id);
      expect(accessibleUserIds).toContain(memberTwoUser.id);
      expect(accessibleUserIds).toContain(adminUser.id);
    });
  });
});
