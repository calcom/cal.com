import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Remove an existing user
 *     operationId: removeUserById
 *     parameters:
 *      - in: path
 *        name: id
 *        example: 1
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the user to delete
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user removed successfuly
 *       400:
 *        description: Bad request. User id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const query = schemaQueryIdParseInt.parse(req.query);
  const isAdmin = await isAdminGuard(req.userId);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && query.id !== req.userId) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  await prisma.user.delete({ where: { id: query.id } });
  return { message: `User with id: ${query.id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
