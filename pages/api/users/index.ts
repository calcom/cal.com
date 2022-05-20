import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { UserResponse, UsersResponse } from "@lib/types";
import { schemaUserReadPublic } from "@lib/validations/user";

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
  if (method === "GET") {
    const data = await prisma.user.findMany({
      where: {
        id: userId,
      },
    });
    const users = data.map((user) => schemaUserReadPublic.parse(user));
    if (users) res.status(200).json({ users });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Users were found",
          error,
        });
  }
  // else if (method === "POST") {
  //   const isAdmin = await prisma.user
  //     .findUnique({ where: { id: userId } })
  //     .then((user) => user?.role === "ADMIN");
  //   if (!isAdmin) res.status(401).json({ message: "You are not authorized" });
  //   else {
  //     const user = await prisma.user.create({
  //       data: schemaUserReadPublic.parse(body),
  //     });
  //     res.status(201).json({ user });
  //   }
  // }
}
// No POST endpoint for users for now as a regular user you're expected to signup.

export default withMiddleware("HTTP_GET_OR_POST")(getAllorCreateUser);
