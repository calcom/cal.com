import type { Membership, Team, User } from "@calcom/prisma/client";
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

/**
 * Does the user have a higher(with more permissions) role in organisation(orgRole) as compared to team(teamRole)
 */
const hasHigherOrgRole = ({ orgRole, teamRole }: { orgRole: MembershipRole; teamRole: MembershipRole }) => {
  // Instead of depending on the order of object keys, we should check the Membership values and then decide
  const mshipToNumber = (mship: MembershipRole) =>
    Object.keys(MembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(orgRole) > mshipToNumber(teamRole);
};

export function getTeamSlug({
  team,
}: {
  team: {
    slug: Team["slug"];
    parentId: Team["parentId"];
  };
}) {
  return team.slug ? (!team.parentId ? `/team` : "" + team.slug) : null;
}

export async function getMembership(teamId: Team["id"], userId: User["id"]) {
  const { prisma } = await import("@calcom/prisma");

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              parentId: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return getMemberShipSync({
    user,
    teamId,
  });
}

export function getMemberShipSync({
  user,
  teamId,
}: {
  user: {
    id: User["id"];
    teams: {
      role: MembershipRole;
      team: Pick<Team, "parentId" | "id">;
    }[];
  };
  teamId: Team["id"];
}) {
  const teamMemberShip = user.teams.find((membership) => membership.team.id === teamId);
  if (!teamMemberShip) {
    throw new Error(`A user can't have teams in it of which he is not a member`);
  }
  const orgMembership = user.teams.find((membership) => membership.team.id === teamMemberShip.team.parentId);

  if (orgMembership) {
    if (hasHigherOrgRole({ orgRole: orgMembership.role, teamRole: teamMemberShip.role })) {
      return orgMembership;
    }
  }
  return teamMemberShip;
}

export async function canCreateEntity({
  targetTeamId,
  user,
}: {
  targetTeamId: number | null | undefined;
  user: Parameters<typeof getMemberShipSync>[0]["user"];
}) {
  if (targetTeamId) {
    // If it doesn't exist and it is being created for a team. Check if user is the member of the team
    const membership = await getMembership(targetTeamId, user.id);
    const creationAllowed = membership
      ? canCreateEntitySync({
          user,
          targetTeamId,
        })
      : false;
    return creationAllowed;
  }
  return true;
}

export function canCreateEntitySync({
  user,
  targetTeamId,
}: {
  targetTeamId: Parameters<typeof getMemberShipSync>[0]["teamId"];
  user: Parameters<typeof getMemberShipSync>[0]["user"];
}) {
  const membership = getMemberShipSync({
    user,
    teamId: targetTeamId,
  });
  return membership.role === "ADMIN" || membership.role === "OWNER";
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
