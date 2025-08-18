import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { membershipCreateBodySchema, schemaMembershipPublic } from "~/lib/validations/membership";

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
async function postHandler(req: NextApiRequest) {
  const data = membershipCreateBodySchema.parse(req.body);
  const args: Prisma.MembershipCreateArgs = {
    data,
  };

  await checkPermissions(req);

  const result = await prisma.membership.create(args);

  return {
    membership: schemaMembershipPublic.parse(result),
    message: "Membership created successfully",
  };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  if (isSystemWideAdmin) return;
  const body = membershipCreateBodySchema.parse(req.body);
  // To prevent auto-accepted invites, limit it to ADMIN users
  if (!isSystemWideAdmin && "accepted" in body)
    throw new HttpError({ statusCode: 403, message: "ADMIN needed for `accepted`" });
  // Only team OWNERS and ADMINS can add other members
  const membership = await prisma.membership.findFirst({
    where: { userId, teamId: body.teamId, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!membership) throw new HttpError({ statusCode: 403, message: "You can't add members to this team" });
}

export default defaultResponder(postHandler);
