import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaUsersReadPublic } from "@lib/validations/user";

import { Prisma } from ".prisma/client";

/**
 * @swagger
 * /users:
 *   get:
 *     operationId: listUsers
 *     summary: Find all users.
 *     tags:
 *     - users
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No users were found
 */
async function getHandler({ userId, prisma }: NextApiRequest) {
  const isAdmin = await isAdminGuard(userId, prisma);
  const where: Prisma.UserWhereInput = {};
  // If user is not ADMIN, return only his data.
  if (!isAdmin) where.id = userId;
  const data = await prisma.user.findMany({ where });
  const users = schemaUsersReadPublic.parse(data);
  return { users };
}

export default defaultResponder(getHandler);
