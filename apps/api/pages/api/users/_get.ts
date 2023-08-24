import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import { schemaQuerySingleOrMultipleUserEmails } from "~/lib/validations/shared/queryUserEmail";
import { schemaUsersReadPublic } from "~/lib/validations/user";

/**
 * @swagger
 * /users:
 *   get:
 *     operationId: listUsers
 *     summary: Find all users.
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
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
export async function getHandler(req: NextApiRequest) {
  const {
    userId,
    prisma,
    isAdmin,
    pagination: { take, skip },
  } = req;
  const where: Prisma.UserWhereInput = {};
  // If user is not ADMIN, return only his data.
  if (!isAdmin) where.id = userId;

  if (req.query.email) {
    const validationResult = schemaQuerySingleOrMultipleUserEmails.safeParse(req.query);

    if (!validationResult.success) {
      // Handle the validation error, maybe return a response or throw an error.
      throw new Error("Invalid email format");
    }

    const { email } = validationResult.data;

    if (email) {
      // If email is a single string
      if (typeof email === "string") {
        where.email = email;
      }
      // If email is an array of strings
      else if (Array.isArray(email)) {
        where.email = {
          in: email,
        };
      }
    }
  }
  const [total, data] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, take, skip }),
  ]);
  const users = schemaUsersReadPublic.parse(data);
  return { users, total };
}

export default withMiddleware("pagination")(defaultResponder(getHandler));
