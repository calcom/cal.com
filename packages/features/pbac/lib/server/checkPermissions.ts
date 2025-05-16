import { prisma } from "@calcom/prisma";

import { PermissionCheckService } from "../../services/permission-check.service";
import { RoleService } from "../../services/role.service";
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
  const roleService = new RoleService(prisma);
  const permissionCheckService = new PermissionCheckService(roleService, prisma);
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
  const roleService = new RoleService(prisma);
  const permissionCheckService = new PermissionCheckService(roleService, prisma);
  return permissionCheckService.hasPermissions({ userId, teamId }, permissions);
}
