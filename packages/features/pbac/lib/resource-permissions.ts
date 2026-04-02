import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { CustomAction } from "../domain/types/permission-registry";
import { CrudAction, Resource } from "../domain/types/permission-registry";
import { PermissionCheckService } from "../services/permission-check.service";

interface RoleMapping {
  roles: MembershipRole[];
  condition?: (userRole: MembershipRole) => boolean;
}

interface FallbackRoleConfig {
  read?: RoleMapping;
  create?: RoleMapping;
  update?: RoleMapping;
  delete?: RoleMapping;
}

interface ResourcePermissionsOptions {
  userId: number;
  teamId: number;
  resource: Resource;
  userRole: MembershipRole;
  fallbackRoles?: FallbackRoleConfig;
}

interface ResourcePermissions {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

const checkRoleAccess = (userRole: MembershipRole, mapping?: RoleMapping): boolean => {
  if (!mapping) return false;

  const { roles, condition } = mapping;
  const hasRole = roles.includes(userRole);

  if (condition) {
    return hasRole && condition(userRole);
  }

  return hasRole;
};

export const getResourcePermissions = async ({
  userId,
  teamId,
  resource,
  userRole,
  fallbackRoles = {},
}: ResourcePermissionsOptions): Promise<ResourcePermissions> => {
  const featureRepo = new FeaturesRepository(prisma);
  const permissionService = new PermissionCheckService();

  const pbacEnabled = await featureRepo.checkIfTeamHasFeature(teamId, "pbac");

  // If PBAC is disabled, use fallback role configuration
  if (!pbacEnabled) {
    return {
      canRead: checkRoleAccess(userRole, fallbackRoles.read),
      canCreate: checkRoleAccess(userRole, fallbackRoles.create),
      canEdit: checkRoleAccess(userRole, fallbackRoles.update),
      canDelete: checkRoleAccess(userRole, fallbackRoles.delete),
    };
  }

  // PBAC is enabled, get permissions from the service
  const resourcePermissions = await permissionService.getResourcePermissions({
    userId,
    teamId,
    resource,
  });

  const roleActions = PermissionMapper.toActionMap(resourcePermissions, resource);

  return {
    canRead: roleActions[CrudAction.Read] ?? false,
    canEdit: roleActions[CrudAction.Update] ?? false,
    canDelete: roleActions[CrudAction.Delete] ?? false,
    canCreate: roleActions[CrudAction.Create] ?? false,
  };
};

// Enhanced function to get specific custom action permissions
type ActionType = CrudAction | CustomAction;

interface SpecificActionMapping {
  [key: string]: RoleMapping;
}

interface SpecificPermissionsOptions {
  userId: number;
  teamId: number;
  resource: Resource;
  userRole: MembershipRole;
  actions: ActionType[];
  fallbackRoles?: SpecificActionMapping;
}

export const getSpecificPermissions = async ({
  userId,
  teamId,
  resource,
  userRole,
  actions,
  fallbackRoles = {},
}: SpecificPermissionsOptions): Promise<Record<string, boolean>> => {
  const featureRepo = new FeaturesRepository(prisma);
  const permissionService = new PermissionCheckService();

  const pbacEnabled = await featureRepo.checkIfTeamHasFeature(teamId, "pbac");

  // If PBAC is disabled, use fallback role configuration
  if (!pbacEnabled) {
    const permissions: Record<string, boolean> = {};
    for (const action of actions) {
      permissions[action] = checkRoleAccess(userRole, fallbackRoles[action]);
    }
    return permissions;
  }

  // PBAC is enabled, get permissions from the service
  const resourcePermissions = await permissionService.getResourcePermissions({
    userId,
    teamId,
    resource,
  });

  const roleActions = PermissionMapper.toActionMap(resourcePermissions, resource);

  const permissions: Record<string, boolean> = {};
  for (const action of actions) {
    permissions[action] = roleActions[action] ?? false;
  }

  return permissions;
};

export async function getRoutingFormPermissions({
  userId,
  formUserId,
  formTeamId,
  formTeamParentId,
}: {
  userId: number;
  formUserId: number;
  formTeamId: number | null;
  formTeamParentId: number | null;
}): Promise<ResourcePermissions | null> {
  if (!formTeamId) {
    if (formUserId !== userId) {
      return null;
    }

    return {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    };
  }

  const membershipRepository = new MembershipRepository();
  const membership = await membershipRepository.findUniqueByUserIdAndTeamId({
    userId,
    teamId: formTeamId,
  });

  let isParentOrgAdmin = false;
  if (!membership && formTeamParentId) {
    const parentOrgMembership = await MembershipRepository.getAdminOrOwnerMembership(
      userId,
      formTeamParentId
    );
    isParentOrgAdmin = !!parentOrgMembership;
  }

  if (!membership && !isParentOrgAdmin) {
    return null;
  }

  if (!membership && isParentOrgAdmin) {
    return {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    };
  }

  if (membership) {
    return await getResourcePermissions({
      userId,
      teamId: formTeamId,
      resource: Resource.RoutingForm,
      userRole: membership.role,
      fallbackRoles: {
        read: { roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER] },
        create: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        update: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        delete: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
      },
    });
  }

  return null;
}
