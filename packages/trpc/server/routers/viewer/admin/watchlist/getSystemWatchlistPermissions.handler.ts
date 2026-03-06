import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

import type { GetSystemWatchlistPermissionsOptions } from "./getSystemWatchlistPermissions.types";

export async function getSystemWatchlistPermissionsHandler(
  opts: GetSystemWatchlistPermissionsOptions
): Promise<{ canRead: boolean; canCreate: boolean; canDelete: boolean; canUpdate: boolean }> {
  const { ctx } = opts;
  const organizationId = ctx.user.organizationId;

  if (!organizationId) {
    return { canRead: true, canCreate: true, canDelete: true, canUpdate: true };
  }

  const permissionCheckService = new PermissionCheckService();
  const fallbackRoles = [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER];

  const [canRead, canCreate, canDelete, canUpdate] = await Promise.all([
    permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "watchlist.read",
      fallbackRoles,
    }),
    permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "watchlist.create",
      fallbackRoles,
    }),
    permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "watchlist.delete",
      fallbackRoles,
    }),
    permissionCheckService.checkPermission({
      userId: ctx.user.id,
      teamId: organizationId,
      permission: "watchlist.update",
      fallbackRoles,
    }),
  ]);

  return { canRead, canCreate, canDelete, canUpdate };
}
