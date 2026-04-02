import { deleteUser } from "@calcom/features/users/lib/deleteUser";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { schemaQueryUserId } from "~/lib/validations/shared/queryUserId";

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Remove an existing user
 *     operationId: removeUserById
 *     parameters:
 *      - in: path
 *        name: userId
 *        example: 1
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the user to delete
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API key
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user removed successfully
 *       400:
 *        description: Bad request. User id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { isSystemWideAdmin } = req;
  const query = schemaQueryUserId.parse(req.query);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isSystemWideAdmin && query.userId !== req.userId)
    throw new HttpError({ statusCode: 403, message: "Forbidden" });

  const user = await prisma.user.findUnique({
    where: { id: query.userId },
    select: {
      id: true,
      email: true,
      metadata: true,
    },
  });
  if (!user) throw new HttpError({ statusCode: 404, message: "User not found" });

  await deleteUser(user);

  return { message: `User with id: ${user.id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
