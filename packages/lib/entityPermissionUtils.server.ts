import { MembershipRole } from "@calcom/prisma/enums";

export const enum ENTITY_PERMISSION_LEVEL {
  NONE,
  // It is owned by user and user has write access to it
  USER_ONLY_WRITE,
  // All members of the team has access to it and user has read access to it
  TEAM_READ_ONLY,
  // All members of the team has access to it and user has write access to it
  TEAM_WRITE,
}

export async function canEditEntity(
  entity: Parameters<typeof getEntityPermissionLevel>[0],
  userId: Parameters<typeof getEntityPermissionLevel>[1]
) {
  const permissionLevel = await getEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_WRITE ||
    permissionLevel === ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE
  );
}

export async function canAccessEntity(
  entity: Parameters<typeof getEntityPermissionLevel>[0],
  userId: Parameters<typeof getEntityPermissionLevel>[1]
) {
  const permissionLevel = await getEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_WRITE ||
    permissionLevel === ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE ||
    permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_READ_ONLY
  );
}

export async function getEntityPermissionLevel(
  entity: {
    userId: number | null;
    teamId: number | null;
  },
  userId: number
) {
  if (entity.teamId) {
    const { prisma } = await import("@calcom/prisma");
    const membership = await prisma.membership.findFirst({
      where: {
        teamId: entity.teamId,
        userId,
        accepted: true,
      },
    });
    const roleForTeamMember = membership?.role;

    if (roleForTeamMember) {
      //TODO: Remove type assertion
      const hasWriteAccessToTeam = (
        [MembershipRole.ADMIN, MembershipRole.OWNER] as unknown as MembershipRole
      ).includes(roleForTeamMember);
      if (hasWriteAccessToTeam) {
        return ENTITY_PERMISSION_LEVEL.TEAM_WRITE;
      } else {
        return ENTITY_PERMISSION_LEVEL.TEAM_READ_ONLY;
      }
    }
  }

  const ownedByUser = entity.userId === userId;
  if (ownedByUser) {
    return ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE;
  }

  return ENTITY_PERMISSION_LEVEL.NONE;
}

async function getMembership(teamId: number | null, userId: number) {
  const { prisma } = await import("@calcom/prisma");

  const team = teamId
    ? await prisma.team.findFirst({
        where: {
          id: teamId,
          members: {
            some: {
              userId,
              accepted: true,
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
  return team?.members.find((membership) => membership.userId === userId);
}

export async function canCreateEntity({
  targetTeamId,
  userId,
}: {
  targetTeamId: number | null | undefined;
  userId: number;
}) {
  if (targetTeamId) {
    // If it doesn't exist and it is being created for a team. Check if user is the member of the team
    const membership = await getMembership(targetTeamId, userId);
    return membership ? withRoleCanCreateEntity(membership.role) : false;
  }
  return true;
}

//TODO: Find a better convention to create different functions for different needs(withRoleCanCreateEntity vs canCreateEntity)
// e.g. if role is already available we don't need to refetch membership.role. We can directly call `withRoleCanCreateEntity`
export function withRoleCanCreateEntity(role: MembershipRole) {
  return role === "ADMIN" || role === "OWNER";
}

/**
 * Whenever the entity is fetched this clause should be there to ensure that
 * 1. No item that doesn't belong to the user or the team is fetched
 * Having just a reusable where allows it to be used with different types of prisma queries.
 */
export const entityPrismaWhereClause = ({ userId }: { userId: number }) => ({
  OR: [
    { userId: userId },
    {
      team: {
        members: {
          some: {
            userId: userId,
            accepted: true,
          },
        },
      },
    },
  ],
});
