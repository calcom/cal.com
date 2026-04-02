import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { membershipIdSchema, schemaMembershipPublic } from "~/lib/validations/membership";

/**
 * @swagger
 * /memberships/{userId}_{teamId}:
 *   get:
 *     summary: Find a membership by userID and teamID
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
export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const userId_teamId = membershipIdSchema.parse(query);
  const args: Prisma.MembershipFindUniqueOrThrowArgs = { where: { userId_teamId } };
  // Just in case the user want to get more info about the team itself
  if (req.query.include === "team") args.include = { team: true };
  const data = await prisma.membership.findUniqueOrThrow(args);
  return { membership: schemaMembershipPublic.parse(data) };
}

export default defaultResponder(getHandler);
