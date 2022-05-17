import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { MembershipResponse, MembershipsResponse } from "@lib/types";
import { schemaMembershipBodyParams, schemaMembershipPublic } from "@lib/validations/membership";

async function createOrlistAllMemberships(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<MembershipsResponse | MembershipResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /memberships:
     *   get:
     *     summary: Find all memberships
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
    /**
     * @swagger
     * /memberships:
     *   post:
     *     summary: Creates a new membership
     *     tags:
     *     - memberships
     *     responses:
     *       201:
     *         description: OK, membership created
     *       400:
     *        description: Bad request. Membership body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaMembershipBodyParams.safeParse(body);
    if (!safe.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

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
