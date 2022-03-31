import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { MembershipResponse } from "@lib/types";
import {
  schemaMembershipBodyParams,
  schemaMembershipPublic,
  withValidMembership,
} from "@lib/validations/membership";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/memberships/{id}/edit:
 *   patch:
 *     summary: Edits an existing membership
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership edited successfuly
 *         model: Membership
 *       400:
 *        description: Bad request. Membership body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editMembership(req: NextApiRequest, res: NextApiResponse<MembershipResponse>) {
  const safeQuery = await schemaQueryIdAsString.safeParse(req.query);
  const safeBody = await schemaMembershipBodyParams.safeParse(req.body);
  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const [userId, teamId] = safeQuery.data.id.split("_");

  const membership = await prisma.membership.update({
    where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } },
    data: safeBody.data,
  });
  const data = schemaMembershipPublic.parse(membership);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(withValidQueryIdString(withValidMembership(editMembership)));
