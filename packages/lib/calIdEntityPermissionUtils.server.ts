import { CalIdMembershipRole } from "@calcom/prisma/enums";

export enum CALID_ENTITY_PERMISSION_LEVEL {
  NONE,
  // It is owned by user and user has write access to it
  USER_ONLY_WRITE,
  // All members of the calid team has access to it and user has read access to it
  CALID_TEAM_READ_ONLY,
  // All members of the calid team has access to it and user has write access to it
  CALID_TEAM_WRITE,
}

export async function canEditCalIdEntity(
  entity: Parameters<typeof getCalIdEntityPermissionLevel>[0],
  userId: Parameters<typeof getCalIdEntityPermissionLevel>[1]
) {
  const permissionLevel = await getCalIdEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === CALID_ENTITY_PERMISSION_LEVEL.CALID_TEAM_WRITE ||
    permissionLevel === CALID_ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE
  );
}

export async function canAccessCalIdEntity(
  entity: Parameters<typeof getCalIdEntityPermissionLevel>[0],
  userId: Parameters<typeof getCalIdEntityPermissionLevel>[1]
) {
  const permissionLevel = await getCalIdEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === CALID_ENTITY_PERMISSION_LEVEL.CALID_TEAM_WRITE ||
    permissionLevel === CALID_ENTITY_PERMISSION_LEVEL.CALID_TEAM_READ_ONLY ||
    permissionLevel === CALID_ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE
  );
}

export async function getCalIdEntityPermissionLevel(
  entity: {
    userId: number | null;
    calIdTeamId: number | null;
  },
  userId: number
) {
  if (entity.calIdTeamId) {
    const { prisma } = await import("@calcom/prisma");
    const membership = await prisma.calIdMembership.findFirst({
      where: {
        calIdTeamId: entity.calIdTeamId,
        userId,
        acceptedInvitation: true,
      },
    });
    const roleForCalIdTeamMember = membership?.role;

    if (roleForCalIdTeamMember) {
      //TODO: Remove type assertion
      const hasWriteAccessToCalIdTeam = (
        [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER] as unknown as CalIdMembershipRole
      ).includes(roleForCalIdTeamMember);
      if (hasWriteAccessToCalIdTeam) {
        return CALID_ENTITY_PERMISSION_LEVEL.CALID_TEAM_WRITE;
      } else {
        return CALID_ENTITY_PERMISSION_LEVEL.CALID_TEAM_READ_ONLY;
      }
    }
  }

  const ownedByUser = entity.userId === userId;
  if (ownedByUser) {
    return CALID_ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE;
  }

  return CALID_ENTITY_PERMISSION_LEVEL.NONE;
}

async function getCalIdMembership(calIdTeamId: number | null, userId: number) {
  const { prisma } = await import("@calcom/prisma");

  const calIdTeam = calIdTeamId
    ? await prisma.calIdTeam.findFirst({
        where: {
          id: calIdTeamId,
          members: {
            some: {
              userId,
              acceptedInvitation: true,
            },
          },
        },
        include: {
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      })
    : null;
  return calIdTeam?.members.find((membership) => membership.userId === userId);
}

export async function canCreateCalIdEntity({
  targetCalIdTeamId,
  userId,
}: {
  targetCalIdTeamId: number | null | undefined;
  userId: number;
}) {
  if (targetCalIdTeamId) {
    // If it doesn't exist and it is being created for a calid team. Check if user is the member of the calid team
    const membership = await getCalIdMembership(targetCalIdTeamId, userId);
    return membership ? withRoleCanCreateCalIdEntity(membership.role) : false;
  }
  return true;
}

//TODO: Find a better convention to create different functions for different needs(withRoleCanCreateCalIdEntity vs canCreateCalIdEntity)
function withRoleCanCreateCalIdEntity(role: CalIdMembershipRole) {
  return [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER].includes(role);
}

/**
 * Whenever the calid entity is fetched this clause should be there to ensure that
 * 1. No item that doesn't belong to the user or the calid team is fetched
 * Having just a reusable where allows it to be used with different types of prisma queries.
 */
export const calidEntityPrismaWhereClause = ({ userId }: { userId: number }) => ({
  OR: [
    { userId: userId },
    {
      calIdTeam: {
        members: {
          some: {
            userId: userId,
            acceptedInvitation: true,
          },
        },
      },
    },
  ],
});
