import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { Resource, CustomAction } from "../domain/types/permission-registry";
import { CrudAction } from "../domain/types/permission-registry";
import { PermissionCheckService } from "../services/permission-check.service";

interface ResourcePermissionsOptions {
  userId: number;
  teamId: number;
  resource: Resource;
}

interface ResourcePermissions {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export const getResourcePermissions = async ({
  userId,
  teamId,
  resource,
}: ResourcePermissionsOptions): Promise<ResourcePermissions> => {
  const permissionService = new PermissionCheckService();

  // Get permissions from the service
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

interface SpecificPermissionsOptions {
  userId: number;
  teamId: number;
  resource: Resource;
  actions: ActionType[];
}

export const getSpecificPermissions = async ({
  userId,
  teamId,
  resource,
  actions,
}: SpecificPermissionsOptions): Promise<Record<string, boolean>> => {
  const permissionService = new PermissionCheckService();

  // Get permissions from the service
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
