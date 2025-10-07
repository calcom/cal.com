import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { Resource } from "../domain/types/permission-registry";
import { PermissionCheckService } from "../services/permission-check.service";

export interface ResourcePermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface EventTypePermissions {
  eventTypes: ResourcePermissions;
  workflows: ResourcePermissions;
}

const createFullPermissions = (): EventTypePermissions => ({
  eventTypes: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  },
  workflows: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  },
});

const mapPermissions = (pbacPermissions: {
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}): ResourcePermissions => ({
  canRead: pbacPermissions.canRead,
  canCreate: pbacPermissions.canCreate,
  canUpdate: pbacPermissions.canEdit,
  canDelete: pbacPermissions.canDelete,
});

const getRoleBasedPermissions = (role: MembershipRole): ResourcePermissions => {
  const canRead = [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER].includes(role);
  const canModify = [MembershipRole.OWNER, MembershipRole.ADMIN].includes(role);

  return {
    canRead,
    canCreate: canModify,
    canUpdate: canModify,
    canDelete: canModify,
  };
};

const getHighestRole = (
  role1: MembershipRole | null,
  role2: MembershipRole | null
): MembershipRole | null => {
  if (!role1) return role2;
  if (!role2) return role1;

  const roleHierarchy = {
    [MembershipRole.OWNER]: 3,
    [MembershipRole.ADMIN]: 2,
    [MembershipRole.MEMBER]: 1,
  };

  return roleHierarchy[role1] >= roleHierarchy[role2] ? role1 : role2;
};

export async function getEventTypePermissions(
  userId: number,
  teamId: number | null
): Promise<EventTypePermissions> {
  // Personal event - user has all permissions
  if (!teamId) {
    return createFullPermissions();
  }

  const permissionCheckService = new PermissionCheckService();
  const featuresRepository = new FeaturesRepository(prisma);

  // Check if PBAC is enabled for the team
  const isPBACEnabled = await featuresRepository.checkIfTeamHasFeature(teamId, "pbac");

  if (isPBACEnabled) {
    const [eventTypePermissions, workflowPermissions] = await Promise.all([
      permissionCheckService.getResourcePermissions({
        userId,
        teamId,
        resource: Resource.EventType,
      }),
      permissionCheckService.getResourcePermissions({
        userId,
        teamId,
        resource: Resource.Workflow,
      }),
    ]);

    return {
      eventTypes: mapPermissions(eventTypePermissions),
      workflows: mapPermissions(workflowPermissions),
    };
  }

  // Fallback to role-based permissions when PBAC is not enabled
  // Check both team membership and org membership (via parentId)
  const [teamMembership, team] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId,
        teamId,
      },
      select: {
        role: true,
      },
    }),
    prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        parentId: true,
      },
    }),
  ]);

  let effectiveRole: MembershipRole | null = teamMembership?.role ?? null;

  // If the team has a parent (org), check for org membership
  if (team?.parentId) {
    const orgMembership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId: team.parentId,
      },
      select: {
        role: true,
      },
    });

    // Use the highest role between team and org
    effectiveRole = getHighestRole(effectiveRole, orgMembership?.role ?? null);
  }

  if (!effectiveRole) {
    throw new Error("Membership not found");
  }

  const rolePermissions = getRoleBasedPermissions(effectiveRole);

  return {
    eventTypes: rolePermissions,
    workflows: rolePermissions,
  };
}
