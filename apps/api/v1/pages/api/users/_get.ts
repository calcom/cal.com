import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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
 *       - in: query
 *         name: email
 *         required: false
 *         schema:
 *          type: array
 *          items:
 *            type: string
 *            format: email
 *         style: form
 *         explode: true
 *         description: The email address or an array of email addresses to filter by
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
    isSystemWideAdmin,
    pagination: { take, skip },
  } = req;
  const where: Prisma.UserWhereInput = {};
  // If user is not ADMIN, return only his data.
  if (!isSystemWideAdmin) where.id = userId;

  if (req.query.email) {
    const validationResult = schemaQuerySingleOrMultipleUserEmails.parse(req.query);
    where.email = {
      in: Array.isArray(validationResult.email) ? validationResult.email : [validationResult.email],
    };
  }

  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, take, skip }),
  ]);
  const users = schemaUsersReadPublic.parse(data);
  return { users, total };
}

export default withMiddleware("pagination")(defaultResponder(getHandler));
