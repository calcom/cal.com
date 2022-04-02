import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { MembershipsResponse } from "@lib/types";
import { schemaMembershipPublic } from "@lib/validations/membership";

/**
 * @swagger
 * /api/memberships:
 *   get:
 *     summary: Returns all memberships
 *     tags:
 *     - memberships
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No memberships were found
 */
async function allMemberships(_: NextApiRequest, res: NextApiResponse<MembershipsResponse>) {
  const memberships = await prisma.membership.findMany();
  const data = memberships.map((membership) => schemaMembershipPublic.parse(membership));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Memberships were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allMemberships);
