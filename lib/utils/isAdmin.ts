import { UserPermissionRole } from "@prisma/client";

import prisma from "@calcom/prisma";

export const isAdminGuard = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === UserPermissionRole.ADMIN;
};
