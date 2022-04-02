import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { MembershipResponse } from "@lib/types";
import {
  schemaMembershipBodyParams,
  schemaMembershipPublic,
  withValidMembership,
} from "@lib/validations/membership";

/**
 * @swagger
 * /api/memberships/new:
 *   post:
 *     summary: Creates a new membership
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
async function createMembership(req: NextApiRequest, res: NextApiResponse<MembershipResponse>) {
  const safe = schemaMembershipBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const membership = await prisma.membership.create({ data: safe.data });
  const data = schemaMembershipPublic.parse(membership);

  if (data) res.status(201).json({ data, message: "Membership created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new membership",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidMembership(createMembership));
