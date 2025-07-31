import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { Resource } from "../domain/types/permission-registry";
import { CrudAction } from "../domain/types/permission-registry";
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
  const featureRepo = new FeaturesRepository();
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
