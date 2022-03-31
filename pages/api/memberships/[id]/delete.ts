import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BaseResponse } from "@lib/types";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/memberships/{userId}_{teamId}/delete:
 *   delete:
 *     summary: Remove an existing membership
 *    parameters:
 *    - in: path
 *    - name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to get the membership of
 *  *    - name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the team to get the membership of
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership removed successfuly
 *         model: Membership
 *       400:
 *        description: Bad request. Membership id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteMembership(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);
  const [userId, teamId] = safe.data.id.split("_");
  const data = await prisma.membership.delete({
    where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } },
  });

  if (data) res.status(200).json({ message: `Membership with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `Membership with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdString(deleteMembership));
