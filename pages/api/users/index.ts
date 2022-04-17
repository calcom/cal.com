import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { UsersResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaUserPublic } from "@lib/validations/user";

/**
 * @swagger
 * /v1/users:
 *   get:
 *     summary: Get all users (admin only), returns your user if regular user.
 *     security:
 *       - ApiKeyAuth: []
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
async function allUsers(req: NextApiRequest, res: NextApiResponse<UsersResponse>) {
  const userId = getCalcomUserId(res);
  const data = await prisma.user.findMany({
    where: {
      id: userId,
    },
  });
  const users = data.map((user) => schemaUserPublic.parse(user));
  if (users) res.status(200).json({ users });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Users were found",
        error,
      });
}
// No POST endpoint for users for now as a regular user you're expected to signup.

export default withMiddleware("HTTP_GET")(allUsers);
