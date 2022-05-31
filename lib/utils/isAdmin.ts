import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/client";

export const isAdminGuard = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === UserPermissionRole.ADMIN;
};
