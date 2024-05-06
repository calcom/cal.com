import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { ScopeOfAdmin } from "~/lib/utils/isAdmin";

type ScopeOfAdminValue = (typeof ScopeOfAdmin)[keyof typeof ScopeOfAdmin];
type AccessibleUsersType = {
  memberUserIds: number[];
  adminUserId: number;
};

const getAllMemberships = async (userIds: number[]) => {
  return await prisma.membership.findMany({
    where: { id: { in: userIds } },
    select: {
      userId: true,
      team: {
        select: {
          id: true,
        },
      },
    },
  });
};

const getAllAdminMemberships = async (userId: number) => {
  return await prisma.membership.findMany({
    where: {
      userId: userId,
      OR: [{ role: MembershipRole.OWNER }, { role: MembershipRole.ADMIN }],
    },
    select: {
      team: {
        select: {
          id: true,
          isOrganization: true,
        },
      },
    },
  });
};

const getTeamsInOrganization = async (adminOrganizationId: number) => {
  return await prisma.team.findMany({
    where: {
      parentId: adminOrganizationId,
    },
    select: {
      id: true,
    },
  });
};

const getAllUsersInTeams = async (teamIds: number[]) => {
  return await prisma.membership.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    select: {
      userId: true,
    },
  });
};

export const getAccessibleUsers = async ({ memberUserIds, adminUserId }: AccessibleUsersType) => {
  const userMemberships = await getAllMemberships(memberUserIds);
  const adminMemberships = await getAllAdminMemberships(adminUserId);

  // Prepare to collect user IDs from matching memberships
  const accessibleUserIds = new Set<number>();

  const adminOrganizationId = adminMemberships.filter((m) => m.team.isOrganization).map((m) => m.team.id)[0];
  if (adminOrganizationId) {
    userMemberships
      .filter((um) => um.team.id === adminOrganizationId)
      .forEach((um) => accessibleUserIds.add(um.userId));
    return Array.from(accessibleUserIds);
  }

  const adminTeamIds = adminMemberships.map((m) => m.team.id);
  if (!!adminTeamIds.length) {
    userMemberships
      .filter((um) => adminTeamIds.includes(um.team.id))
      .forEach((um) => accessibleUserIds.add(um.userId));
    return Array.from(accessibleUserIds);
  }

  return [];
};

export const retrieveOrgScopedAccessibleUsers = async ({ adminId }: { adminId: number }) => {
  const adminMemberships = await getAllAdminMemberships(adminId);
  const adminOrganizationId = adminMemberships.filter((m) => m.team.isOrganization).map((m) => m.team.id)[0];
  if (adminOrganizationId) {
    const teamsInOrganization = await getTeamsInOrganization(adminOrganizationId);
    const teamIds = teamsInOrganization.map((team) => team.id);

    const allMembershipsInteams = await getAllUsersInTeams(teamIds);
    const userIds = new Set(allMembershipsInteams.map((membership) => membership.userId));
    return Array.from(userIds);
  }
  return [];
};

export const retrieveScopedAccessibleUsers = async ({
  adminId,
  scope,
}: {
  adminId: number;
  scope: ScopeOfAdminValue;
}) => {
  const adminMemberships = await getAllAdminMemberships(adminId);

  if (scope === ScopeOfAdmin.OrgOwnerOrAdmin) {
    const adminOrganizationId = adminMemberships
      .filter((m) => m.team.isOrganization)
      .map((m) => m.team.id)[0];
    const teamsInOrganization = await getTeamsInOrganization(adminOrganizationId);
    const teamIds = teamsInOrganization.map((team) => team.id);

    const allMembershipsInteams = await getAllUsersInTeams(teamIds);
    const userIds = new Set(allMembershipsInteams.map((membership) => membership.userId));
    return Array.from(userIds);
  }

  return [];
};
