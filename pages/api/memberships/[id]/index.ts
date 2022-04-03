import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { MembershipResponse } from "@lib/types";
import { schemaMembershipPublic } from "@lib/validations/membership";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/memberships/{userId}_{teamId}:
 *   get:
 *     summary: find membership by userID and teamID
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
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Membership was not found
 */
export async function membershipById(req: NextApiRequest, res: NextApiResponse<MembershipResponse>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");
  const [userId, teamId] = safe.data.id.split("_");

  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } },
  });
  const data = schemaMembershipPublic.parse(membership);

  if (membership) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Membership was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdString(membershipById));
