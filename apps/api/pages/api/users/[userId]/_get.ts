import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryUserId } from "~/lib/validations/shared/queryUserId";
import { schemaUserReadPublic } from "~/lib/validations/user";

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Find a user, returns your user if regular user.
 *     operationId: getUserById
 *     parameters:
 *       - in: path
 *         name: userId
 *         example: 4
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user to get
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: Your API key
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
  const { prisma, isAdmin } = req;

  const query = schemaQueryUserId.parse(req.query);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && query.userId !== req.userId) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  const data = await prisma.user.findUnique({ where: { id: query.userId } });
  const user = schemaUserReadPublic.parse(data);
  return { user };
}

export default defaultResponder(getHandler);
