import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { UserResponse, UsersResponse } from "@lib/types";
import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaUserReadPublic, schemaUserCreateBodyParams } from "@lib/validations/user";

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
async function getAllorCreateUser(
  { userId, method, body }: NextApiRequest,
  res: NextApiResponse<UsersResponse | UserResponse>
) {
  const isAdmin = await isAdminGuard(userId);
  if (method === "GET") {
    if (!isAdmin) {
      const data = await prisma.user.findMany({
        where: {
          id: userId,
        },
      });
      const users = data.map((user) => schemaUserReadPublic.parse(user));
      if (users) res.status(200).json({ users });
    } else {
      const data = await prisma.user.findMany({});
      const users = data.map((user) => schemaUserReadPublic.parse(user));
      if (users) res.status(200).json({ users });
    }
  } else if (method === "POST") {
    if (!isAdmin) res.status(401).json({ message: "You are not authorized" });
    else {
      const safeBody = schemaUserCreateBodyParams.safeParse(body);
      if (!safeBody.success) {
        res.status(400).json({ message: "Your body was invalid" });
        return;
      }
      const user = await prisma.user.create({
        data: safeBody.data,
      });
      res.status(201).json({ user });
    }
  }
}

export default withMiddleware("HTTP_GET_OR_POST")(getAllorCreateUser);
