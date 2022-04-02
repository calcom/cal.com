import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { UserResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaUserBodyParams, schemaUserPublic, withValidUser } from "@lib/validations/user";

/**
 * @swagger
 * /api/users/{id}/edit:
 *   patch:
 *     summary: Edit an existing user
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to edit
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user edited successfuly
 *         model: User
 *       400:
 *        description: Bad request. User body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editUser(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaUserBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const user = await prisma.user.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaUserPublic.parse(user);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(withValidQueryIdTransformParseInt(withValidUser(editUser)));
