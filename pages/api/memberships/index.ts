import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { MembershipResponse, MembershipsResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaMembershipBodyParams, schemaMembershipPublic } from "@lib/validations/membership";

/**
 * @swagger
 * /v1/memberships:
 *   get:
 *     summary: Get all memberships
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - memberships
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No memberships were found
 *   post:
 *     summary: Creates a new membership
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership created
 *         model: Membership
 *       400:
 *        description: Bad request. Membership body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllMemberships(
  req: NextApiRequest,
  res: NextApiResponse<MembershipsResponse | MembershipResponse>
) {
  const { method } = req;
  const userId = getCalcomUserId(res);
  if (method === "GET") {
    const data = await prisma.membership.findMany({ where: { userId } });
    const memberships = data.map((membership) => schemaMembershipPublic.parse(membership));
    if (memberships) res.status(200).json({ memberships });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Memberships were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaMembershipBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.membership.create({ data: { ...safe.data, userId } });
    const membership = schemaMembershipPublic.parse(data);

    if (membership) res.status(201).json({ membership, message: "Membership created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new membership",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllMemberships);
