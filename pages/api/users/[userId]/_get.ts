import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaQueryUserId } from "@lib/validations/shared/queryUserId";
import { schemaUserReadPublic } from "@lib/validations/user";

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Find a user, returns your user if regular user.
 *     operationId: getUserById
 *     parameters:
 *       - in: path
 *         name: id
 *         example: 4
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user to get
 *     tags:
 *     - users
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: User was not found
 */
export async function getHandler(req: NextApiRequest) {
  const query = schemaQueryUserId.parse(req.query);
  const isAdmin = await isAdminGuard(req.userId);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && query.userId !== req.userId)
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  const data = await prisma.user.findUnique({ where: { id: query.userId } });
  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultResponder(getHandler);
