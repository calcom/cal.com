<<<<<<< HEAD
import type { NextApiRequest, NextApiResponse } from "next";
=======
import { defaultHandler } from "@calcom/lib/server";
>>>>>>> main

import { withMiddleware } from "@lib/helpers/withMiddleware";

<<<<<<< HEAD
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
  { userId, method, body, prisma }: NextApiRequest,
  res: NextApiResponse<UsersResponse | UserResponse>
) {
  const isAdmin = await isAdminGuard(userId);
  if (method === "GET") {
    if (!isAdmin) {
      // If user is not ADMIN, return only his data.
      const data = await prisma.user.findMany({ where: { id: userId } });
      const users = data.map((user) => schemaUserReadPublic.parse(user));
      if (users) res.status(200).json({ users });
    } else {
      // If user is admin, return all users.
      const data = await prisma.user.findMany({});
      const users = data.map((user) => schemaUserReadPublic.parse(user));
      if (users) res.status(200).json({ users });
    }
  } else if (method === "POST") {
    // If user is not ADMIN, return unauthorized.
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
=======
export default withMiddleware("HTTP_GET_OR_POST")(
  defaultHandler({
    GET: import("./_get"),
    POST: import("./_post"),
  })
);
>>>>>>> main
