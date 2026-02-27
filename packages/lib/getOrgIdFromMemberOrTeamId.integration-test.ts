import "@calcom/testing/lib/__mocks__/prisma";
import { describe, it, expect } from "vitest";

import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import getOrgIdFromMemberOrTeamId, { getPublishedOrgIdFromMemberOrTeamId } from "./getOrgIdFromMemberOrTeamId";

describe("getOrgIdFromMemberOrTeamId integration tests", () => {
  describe("getOrgIdFromMemberOrTeamId", () => {
    it("finds org by member ID", async () => {
      const org = await prisma.team.create({
        data: {
          name: "Test Org",
          slug: `org-${Date.now()}`,
          isOrganization: true,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `orgmember-${Date.now()}@test.com`,
          username: `orgmember-${Date.now()}`,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await getOrgIdFromMemberOrTeamId({ memberId: user.id });
      expect(result).toBe(org.id);
    });

    it("finds org by child team ID", async () => {
      const org = await prisma.team.create({
        data: {
          name: "Parent Org",
          slug: `parentorg-${Date.now()}`,
          isOrganization: true,
        },
      });

      const childTeam = await prisma.team.create({
        data: {
          name: "Child Team",
          slug: `child-${Date.now()}`,
          parentId: org.id,
        },
      });

      const result = await getOrgIdFromMemberOrTeamId({ teamId: childTeam.id });
      expect(result).toBe(org.id);
    });

    it("returns undefined when member is not in any org", async () => {
      const user = await prisma.user.create({
        data: {
          email: `nonorg-${Date.now()}@test.com`,
          username: `nonorg-${Date.now()}`,
        },
      });

      const result = await getOrgIdFromMemberOrTeamId({ memberId: user.id });
      expect(result).toBeUndefined();
    });

    it("returns undefined when neither memberId nor teamId provided", async () => {
      const result = await getOrgIdFromMemberOrTeamId({});
      expect(result).toBeUndefined();
    });

    it("finds org when both memberId and teamId are provided", async () => {
      const org = await prisma.team.create({
        data: {
          name: "Both Org",
          slug: `bothorg-${Date.now()}`,
          isOrganization: true,
        },
      });

      const childTeam = await prisma.team.create({
        data: {
          name: "Both Child",
          slug: `bothchild-${Date.now()}`,
          parentId: org.id,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `bothuser-${Date.now()}@test.com`,
          username: `bothuser-${Date.now()}`,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await getOrgIdFromMemberOrTeamId({
        memberId: user.id,
        teamId: childTeam.id,
      });
      expect(result).toBe(org.id);
    });
  });

  describe("getPublishedOrgIdFromMemberOrTeamId", () => {
    it("returns org ID for published org (non-null slug)", async () => {
      const org = await prisma.team.create({
        data: {
          name: "Published Org",
          slug: `puborg-${Date.now()}`,
          isOrganization: true,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `pubuser-${Date.now()}@test.com`,
          username: `pubuser-${Date.now()}`,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await getPublishedOrgIdFromMemberOrTeamId({ memberId: user.id });
      expect(result).toBe(org.id);
    });

    it("returns undefined for unpublished org (null slug)", async () => {
      const org = await prisma.team.create({
        data: {
          name: "Unpublished Org",
          slug: null,
          isOrganization: true,
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `unpubuser-${Date.now()}@test.com`,
          username: `unpubuser-${Date.now()}`,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const result = await getPublishedOrgIdFromMemberOrTeamId({ memberId: user.id });
      expect(result).toBeUndefined();
    });

    it("returns undefined when member is not in any org", async () => {
      const user = await prisma.user.create({
        data: {
          email: `nopuborg-${Date.now()}@test.com`,
          username: `nopuborg-${Date.now()}`,
        },
      });

      const result = await getPublishedOrgIdFromMemberOrTeamId({ memberId: user.id });
      expect(result).toBeUndefined();
    });
  });
});
