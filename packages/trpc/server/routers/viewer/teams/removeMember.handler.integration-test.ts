import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeMemberHandler } from "./removeMember.handler";

const timestamp = Date.now();
const unique = (): string => randomBytes(4).toString("hex");

let team: Team;
let org: Team;
let orgTeam: Team;

let ownerUser: User;
let adminUser: User;
let memberUser: User;
let memberUser2: User;
let orgAdminUser: User;
let outsiderUser: User;

const createdUserIds: number[] = [];
const createdTeamIds: number[] = [];

type RemoveMemberArgs = Parameters<typeof removeMemberHandler>[0];

function buildCtx(
  user: User,
  opts: { organizationId?: number | null; isOrgAdmin?: boolean } = {}
): RemoveMemberArgs["ctx"] {
  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      organizationId: opts.organizationId ?? null,
      organization: opts.organizationId
        ? { id: opts.organizationId, isOrgAdmin: opts.isOrgAdmin ?? false }
        : undefined,
    },
    sourceIp: "127.0.0.1",
  };
}

describe("teams/removeMember.handler - integration", () => {
  beforeAll(async () => {
    ownerUser = await prisma.user.create({
      data: {
        username: `rm-owner-${timestamp}-${unique()}`,
        email: `rm-owner-${timestamp}-${unique()}@example.com`,
        name: "Team Owner",
      },
    });
    createdUserIds.push(ownerUser.id);

    adminUser = await prisma.user.create({
      data: {
        username: `rm-admin-${timestamp}-${unique()}`,
        email: `rm-admin-${timestamp}-${unique()}@example.com`,
        name: "Team Admin",
      },
    });
    createdUserIds.push(adminUser.id);

    memberUser = await prisma.user.create({
      data: {
        username: `rm-member-${timestamp}-${unique()}`,
        email: `rm-member-${timestamp}-${unique()}@example.com`,
        name: "Team Member",
      },
    });
    createdUserIds.push(memberUser.id);

    memberUser2 = await prisma.user.create({
      data: {
        username: `rm-member2-${timestamp}-${unique()}`,
        email: `rm-member2-${timestamp}-${unique()}@example.com`,
        name: "Team Member 2",
      },
    });
    createdUserIds.push(memberUser2.id);

    orgAdminUser = await prisma.user.create({
      data: {
        username: `rm-orgadmin-${timestamp}-${unique()}`,
        email: `rm-orgadmin-${timestamp}-${unique()}@example.com`,
        name: "Org Admin",
      },
    });
    createdUserIds.push(orgAdminUser.id);

    outsiderUser = await prisma.user.create({
      data: {
        username: `rm-outsider-${timestamp}-${unique()}`,
        email: `rm-outsider-${timestamp}-${unique()}@example.com`,
        name: "Outsider",
      },
    });
    createdUserIds.push(outsiderUser.id);

    team = await prisma.team.create({
      data: {
        name: `RM Test Team ${timestamp}-${unique()}`,
        slug: `rm-test-team-${timestamp}-${unique()}`,
      },
    });
    createdTeamIds.push(team.id);

    org = await prisma.team.create({
      data: {
        name: `RM Test Org ${timestamp}-${unique()}`,
        slug: `rm-test-org-${timestamp}-${unique()}`,
        isOrganization: true,
      },
    });
    createdTeamIds.push(org.id);

    orgTeam = await prisma.team.create({
      data: {
        name: `RM Org Team ${timestamp}-${unique()}`,
        slug: `rm-org-team-${timestamp}-${unique()}`,
        parentId: org.id,
      },
    });
    createdTeamIds.push(orgTeam.id);

    await prisma.membership.createMany({
      data: [
        { teamId: team.id, userId: ownerUser.id, role: MembershipRole.OWNER, accepted: true },
        { teamId: team.id, userId: adminUser.id, role: MembershipRole.ADMIN, accepted: true },
        { teamId: team.id, userId: memberUser.id, role: MembershipRole.MEMBER, accepted: true },
        { teamId: team.id, userId: memberUser2.id, role: MembershipRole.MEMBER, accepted: true },
        { teamId: orgTeam.id, userId: orgAdminUser.id, role: MembershipRole.ADMIN, accepted: true },
        { teamId: orgTeam.id, userId: memberUser.id, role: MembershipRole.MEMBER, accepted: true },
        { teamId: org.id, userId: orgAdminUser.id, role: MembershipRole.ADMIN, accepted: true },
      ],
    });
  });

  afterAll(async () => {
    try {
      if (createdTeamIds.length > 0) {
        await prisma.membership.deleteMany({ where: { teamId: { in: createdTeamIds } } });
      }
      if (createdTeamIds.length > 0) {
        await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("input validation", () => {
    it("should throw BAD_REQUEST when no team IDs are provided", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(adminUser),
        input: { teamIds: [], memberIds: [memberUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("At least one team ID");
    });
  });

  describe("permission checks", () => {
    it("should throw UNAUTHORIZED when a non-member tries to remove someone", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(outsiderUser),
        input: { teamIds: [team.id], memberIds: [memberUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
    });

    it("should throw UNAUTHORIZED when a MEMBER tries to remove another member", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(memberUser),
        input: { teamIds: [team.id], memberIds: [memberUser2.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("owner protection", () => {
    it("should throw FORBIDDEN when owner tries to remove themselves from their owned team", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(ownerUser),
        input: { teamIds: [team.id], memberIds: [ownerUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("can not remove yourself from a team you own");
    });

    it("should throw UNAUTHORIZED when non-owner admin tries to remove the owner", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(adminUser),
        input: { teamIds: [team.id], memberIds: [ownerUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Only a team owner can remove another team owner");
    });
  });

  describe("successful removal", () => {
    it("should allow an admin to remove a regular member", async () => {
      const targetUser = await prisma.user.create({
        data: {
          username: `rm-target-${timestamp}-${unique()}`,
          email: `rm-target-${timestamp}-${unique()}@example.com`,
          name: "Removal Target",
        },
      });
      createdUserIds.push(targetUser.id);

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: targetUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const membershipBefore = await prisma.membership.findFirst({
        where: { teamId: team.id, userId: targetUser.id },
      });
      expect(membershipBefore).not.toBeNull();

      await removeMemberHandler({
        ctx: buildCtx(adminUser),
        input: { teamIds: [team.id], memberIds: [targetUser.id], isOrg: false },
      });

      const membershipAfter = await prisma.membership.findFirst({
        where: { teamId: team.id, userId: targetUser.id },
      });
      expect(membershipAfter).toBeNull();
    });

    it("should allow a member to remove themselves (self-leave)", async () => {
      const selfLeaveUser = await prisma.user.create({
        data: {
          username: `rm-selfleave-${timestamp}-${unique()}`,
          email: `rm-selfleave-${timestamp}-${unique()}@example.com`,
          name: "Self Leave",
        },
      });
      createdUserIds.push(selfLeaveUser.id);

      await prisma.membership.create({
        data: {
          teamId: team.id,
          userId: selfLeaveUser.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await removeMemberHandler({
        ctx: buildCtx(selfLeaveUser),
        input: { teamIds: [team.id], memberIds: [selfLeaveUser.id], isOrg: false },
      });

      const membershipAfter = await prisma.membership.findFirst({
        where: { teamId: team.id, userId: selfLeaveUser.id },
      });
      expect(membershipAfter).toBeNull();
    });

    it("should allow an org admin to remove a member from an org team", async () => {
      const orgMember = await prisma.user.create({
        data: {
          username: `rm-orgmem-${timestamp}-${unique()}`,
          email: `rm-orgmem-${timestamp}-${unique()}@example.com`,
          name: "Org Member",
        },
      });
      createdUserIds.push(orgMember.id);

      await prisma.membership.create({
        data: {
          teamId: orgTeam.id,
          userId: orgMember.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await removeMemberHandler({
        ctx: buildCtx(orgAdminUser, { organizationId: org.id, isOrgAdmin: true }),
        input: { teamIds: [orgTeam.id], memberIds: [orgMember.id], isOrg: false },
      });

      const membershipAfter = await prisma.membership.findFirst({
        where: { teamId: orgTeam.id, userId: orgMember.id },
      });
      expect(membershipAfter).toBeNull();
    });
  });

  describe("org admin edge cases", () => {
    it("should deny a user with no membership on org team even if isOrgAdmin flag is set but organizationId is null", async () => {
      // Without organizationId, the handler ignores isOrgAdmin flag.
      // outsiderUser has no direct membership on orgTeam, so permission check should fail.
      const error = await removeMemberHandler({
        ctx: buildCtx(outsiderUser, { organizationId: null, isOrgAdmin: true }),
        input: { teamIds: [orgTeam.id], memberIds: [memberUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
    });

    it("should deny org admin for teams outside their organization", async () => {
      const error = await removeMemberHandler({
        ctx: buildCtx(orgAdminUser, { organizationId: org.id, isOrgAdmin: true }),
        input: { teamIds: [team.id], memberIds: [memberUser.id], isOrg: false },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
    });
  });
});
