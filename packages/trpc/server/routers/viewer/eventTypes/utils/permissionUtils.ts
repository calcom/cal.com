import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { MembershipRole } from "@calcom/prisma/enums";

export interface TeamPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRead: boolean;
}

export interface MembershipWithRole {
  teamId: number;
  membershipRole: MembershipRole;
}

const MEMBERSHIP_HIERARCHY: Record<MembershipRole, number> = {
  [MembershipRole.MEMBER]: 1,
  [MembershipRole.ADMIN]: 2,
  [MembershipRole.OWNER]: 3,
};

export function hasHigherPrivilege(role1: MembershipRole, role2: MembershipRole): boolean {
  return MEMBERSHIP_HIERARCHY[role1] > MEMBERSHIP_HIERARCHY[role2];
}

export function getEffectiveRole(
  orgMembership: MembershipRole | undefined,
  membershipRole: MembershipRole
): MembershipRole {
  return orgMembership && hasHigherPrivilege(orgMembership, membershipRole) ? orgMembership : membershipRole;
}

export async function getTeamPermissions(
  userId: number,
  teamId: number,
  effectiveRole: MembershipRole
): Promise<TeamPermissions> {
  try {
    const permissions = await getResourcePermissions({
      userId,
      teamId,
      resource: Resource.EventType,
      userRole: effectiveRole,
      fallbackRoles: {
        read: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
        },
        create: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        update: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        delete: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    });

    return {
      canCreate: permissions.canCreate,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canRead: permissions.canRead,
    };
  } catch (error) {
    console.warn(
      `PBAC check failed for user ${userId} on team ${teamId}, falling back to role check:`,
      error
    );

    return getFallbackPermissions(effectiveRole);
  }
}

function getFallbackPermissions(role: MembershipRole): TeamPermissions {
  const isAdminOrOwner = role === MembershipRole.ADMIN || role === MembershipRole.OWNER;
  const isMember = role === MembershipRole.MEMBER;

  return {
    canRead: isAdminOrOwner || isMember,
    canCreate: isAdminOrOwner,
    canEdit: isAdminOrOwner,
    canDelete: isAdminOrOwner,
  };
}

export async function buildTeamPermissionsMap(
  memberships: Array<{ team: { id: number; parentId?: number | null }; role: MembershipRole }>,
  teamMemberships: MembershipWithRole[],
  userId: number
): Promise<Map<number, TeamPermissions>> {
  const permissionPromises = memberships.map(async (membership) => {
    const orgMembership = teamMemberships.find(
      (teamM) => teamM.teamId === membership.team.parentId
    )?.membershipRole;

    const effectiveRole = getEffectiveRole(orgMembership, membership.role);
    const permissions = await getTeamPermissions(userId, membership.team.id, effectiveRole);

    return [membership.team.id, permissions] as const;
  });

  const results = await Promise.all(permissionPromises);
  return new Map(results);
}
