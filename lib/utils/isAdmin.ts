import { PrismaClient, UserPermissionRole } from "@prisma/client";

export const isAdminGuard = async (userId: number, prisma: PrismaClient) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === UserPermissionRole.ADMIN;
};
