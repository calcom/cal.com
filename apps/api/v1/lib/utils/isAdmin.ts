import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

export const isAdminGuard = async (req: NextApiRequest) => {
  const { userId } = req;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === UserPermissionRole.ADMIN;
};
