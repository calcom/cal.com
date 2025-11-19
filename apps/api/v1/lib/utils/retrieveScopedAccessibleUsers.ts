import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

type AccessibleUsersType = {
  memberUserIds: number[];
  adminUserId: number;
};

const getAllOrganizationMemberships = async (
  memberships: {
    userId: number;
    role: MembershipRole;
    teamId: number;
  }[],
  orgId: number
) => {
  return memberships.reduce<number[]>((acc, membership) => {
    if (membership.teamId === orgId) {
      acc.push(membership.userId);
    }
    return acc;
  }, []);
};

const getAllAdminMemberships = async (userId: number) => {
  return await prisma.membership.findMany({
    where: {
      userId: userId,
      accepted: true,
      role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
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

const getAllOrganizationMembers = async (organizationId: number) => {
  return await prisma.membership.findMany({
    where: {
      teamId: organizationId,
      accepted: true,
    },
    select: {
      userId: true,
    },
  });
};

export const getAccessibleUsers = async ({
  memberUserIds,
  adminUserId,
}: AccessibleUsersType): Promise<number[]> => {
  const orConditions = [];
  if (memberUserIds.length > 0) {
    orConditions.push({ userId: { in: memberUserIds } });
  }
  orConditions.push({ userId: adminUserId, role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] } });

  const memberships = await prisma.membership.findMany({
    where: {
      team: {
        isOrganization: true,
      },
      accepted: true,
      OR: orConditions,
    },
    select: {
      userId: true,
      role: true,
      teamId: true,
    },
  });

  const orgId = memberships.find((membership) => membership.userId === adminUserId)?.teamId;
  if (!orgId) return [];

  const allAccessibleMemberUserIds = await getAllOrganizationMemberships(memberships, orgId);
  const accessibleUserIds = allAccessibleMemberUserIds.filter((userId) => userId !== adminUserId);
  return accessibleUserIds;
};

export const retrieveOrgScopedAccessibleUsers = async ({ adminId }: { adminId: number }) => {
  const adminMemberships = await getAllAdminMemberships(adminId);
  const organizationId = adminMemberships.find((membership) => membership.team.isOrganization)?.team.id;
  if (!organizationId) return [];

  const allMemberships = await getAllOrganizationMembers(organizationId);
  return allMemberships.map((membership) => membership.userId);
};
