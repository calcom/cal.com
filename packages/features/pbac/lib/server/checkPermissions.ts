import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

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
  const roleService = new RoleService(prisma as PrismaClient);
  const permissionCheckService = new PermissionCheckService(roleService, prisma as PrismaClient);
  return permissionCheckService.hasPermission({ userId, teamId }, permission);
}

export async function checkSessionPermissionInTeam({
  teamId,
  permission,
  req,
}: {
  teamId: number;
  permission: PermissionString;
  req: NextApiRequest;
}) {
  const session = await getServerSession({ req });
  if (!session?.user?.id) return false;

  return checkUserPermissionInTeam({
    userId: session.user.id,
    teamId,
    permission,
  });
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
  const roleService = new RoleService(prisma as PrismaClient);
  const permissionCheckService = new PermissionCheckService(roleService, prisma as PrismaClient);
  return permissionCheckService.hasPermissions({ userId, teamId }, permissions);
}
