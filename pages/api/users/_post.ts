import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaUserCreateBodyParams } from "@lib/validations/user";

/**
 * @swagger
 * /users:
 *   post:
 *     operationId: addUser
 *     summary: Creates a new user
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user created
 *       400:
 *        description: Bad request. user body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  // If user is not ADMIN, return unauthorized.
  if (!isAdmin) throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  const data = await schemaUserCreateBodyParams.parseAsync(req.body);
  const user = await prisma.user.create({ data });
  req.statusCode = 201;
  return { user };
}

export default defaultResponder(postHandler);
