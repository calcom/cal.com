import type { Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

export const enum ENTITY_PERMISSION_LEVEL {
  NONE,
  USER_ONLY_WRITE,
  TEAM_READ_ONLY,
  TEAM_WRITE,
}

export function hasUserWriteAccessToEntity(
  entity: Parameters<typeof getEntityPermissionLevel>[0],
  userId: Parameters<typeof getEntityPermissionLevel>[1]
) {
  const permissionLevel = getEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_WRITE ||
    permissionLevel === ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE
  );
}

export function getEntityPermissionLevel(
  entity: {
    userId: number | null;
    team: { members: Membership[] } | null;
  },
  userId: number
) {
  if (entity.team) {
    const roleForTeamMember = entity.team.members.find((member) => member.userId === userId)?.role;
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

export async function isUserMemberOfTeam(teamId: number | null, userId: number) {
  const { prisma } = await import("@calcom/prisma");

  return teamId
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
      })
    : null;
}

export async function canCreateEntity({
  targetTeamId,
  userId,
}: {
  targetTeamId: number | null | undefined;
  userId: number;
}) {
  if (targetTeamId) {
    // If form doesn't exist and it is being created for a team. Check if user is the member of the team
    const _isUserMemberOfTeam = await isUserMemberOfTeam(targetTeamId, userId);
    const creationAllowed = _isUserMemberOfTeam;
    return creationAllowed;
  }
  return true;
}

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
