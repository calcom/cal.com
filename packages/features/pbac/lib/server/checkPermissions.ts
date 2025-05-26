import { PermissionCheckService } from "../../services/permission-check.service";
import type { PermissionString } from "../../types/permission-registry";

export async function checkUserPermissionInTeam({
  userId,
  teamId,
  permission,
}: {
  userId: number;
  teamId: number;
  permission: PermissionString;
}) {
  const permissionCheckService = new PermissionCheckService();
  return permissionCheckService.hasPermission({ userId, teamId }, permission);
}

export async function checkMultiplePermissionsInTeam({
  userId,
  teamId,
  permissions,
}: {
  userId: number;
  teamId: number;
  permissions: PermissionString[];
}) {
  const permissionCheckService = new PermissionCheckService();
  return permissionCheckService.hasPermissions({ userId, teamId }, permissions);
}
