import type { Membership, Team } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const enum ENTITY_PERMISSION_LEVEL {
  NONE,
  USER_ONLY_WRITE,
  TEAM_READ_ONLY,
  TEAM_WRITE,
}

export function canEditEntity(
  entity: Parameters<typeof getEntityPermissionLevel>[0],
  userId: Parameters<typeof getEntityPermissionLevel>[1]
) {
  const permissionLevel = getEntityPermissionLevel(entity, userId);
  return (
    permissionLevel === ENTITY_PERMISSION_LEVEL.TEAM_WRITE ||
    permissionLevel === ENTITY_PERMISSION_LEVEL.USER_ONLY_WRITE
  );
}

export function isOrganization({ team }: { team: { metadata: Team["metadata"] } }) {
  return teamMetadataSchema.parse(team.metadata)?.isOrganization;
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
          members: true,
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
    const creationAllowed = membership ? withRoleCanCreateEntity(membership.role) : false;
    return creationAllowed;
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

/**
 * It returns true if the two entities are created for the same team or same user.
 */
export const areTheySiblingEntitites = ({
  entity1,
  entity2,
}: {
  entity1: { teamId: number | null; userId: number | null };
  entity2: { teamId: number | null; userId: number | null };
}) => {
  if (entity1.teamId) {
    return entity1.teamId === entity2.teamId;
  }
  // If entity doesn't belong to a team, then target shouldn't be a team.
  // Also check for `userId` now.
  return !entity2.teamId && entity1.userId === entity2.userId;
};
