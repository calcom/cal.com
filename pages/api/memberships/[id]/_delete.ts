import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { membershipIdSchema } from "@lib/validations/membership";
import { schemaQueryIdAsString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /memberships/{userId}_{teamId}:
 *   delete:
 *     summary: Remove an existing membership
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the membership to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the membership to get
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership removed successfuly
 *       400:
 *        description: Bad request. Membership id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const userId_teamId = membershipIdSchema.parse(query);
  await prisma.membership.delete({ where: { userId_teamId } });
  return { message: `Membership with id: ${query.id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
