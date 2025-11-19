import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import {
  membershipEditBodySchema,
  membershipIdSchema,
  schemaMembershipPublic,
} from "~/lib/validations/membership";

/**
 * @swagger
 * /memberships/{userId}_{teamId}:
 *   patch:
 *     summary: Edit an existing membership
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
 *         description: OK, membership edited successfully
 *       400:
 *        description: Bad request. Membership body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { query } = req;
  const userId_teamId = membershipIdSchema.parse(query);
  const data = membershipEditBodySchema.parse(req.body);
  const args: Prisma.MembershipUpdateArgs = {
    where: { userId_teamId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  };

  await checkPermissions(req);

  const result = await prisma.membership.update(args);
  return { membership: schemaMembershipPublic.parse(result) };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { userId: queryUserId, teamId } = membershipIdSchema.parse(req.query);
  const data = membershipEditBodySchema.parse(req.body);
  // Admins can just skip this check
  if (isSystemWideAdmin) return;
  // Only the invited user can accept the invite
  if ("accepted" in data && queryUserId !== userId)
    throw new HttpError({
      statusCode: 403,
      message: "Only the invited user can accept the invite",
    });
  // Only team OWNERS and ADMINS can modify `role`
  if ("role" in data) {
    const membership = await prisma.membership.findFirst({
      where: { userId, teamId, role: { in: ["ADMIN", "OWNER"] } },
    });
    if (!membership || (membership.role !== "OWNER" && req.body.role === "OWNER"))
      throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }
}

export default defaultResponder(patchHandler);
