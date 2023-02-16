import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaMembershipPublic } from "~/lib/validations/membership";
import {
  schemaQuerySingleOrMultipleTeamIds,
  schemaQuerySingleOrMultipleUserIds,
} from "~/lib/validations/shared/queryUserId";

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
async function getHandler(req: NextApiRequest) {
  const { prisma } = req;
  const args: Prisma.MembershipFindManyArgs = {
    where: {
      /** Admins can query multiple users */
      userId: { in: getUserIds(req) },
      /** Admins can query multiple teams as well */
      teamId: { in: getTeamIds(req) },
    },
  };
  // Just in case the user want to get more info about the team itself
  if (req.query.include === "team") args.include = { team: true };

  const data = await prisma.membership.findMany(args);
  return { memberships: data.map((v) => schemaMembershipPublic.parse(v)) };
}

/**
 * Returns requested users IDs only if admin, otherwise return only current user ID
 */
function getUserIds(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  /** Only admins can query other users */
  if (!isAdmin && req.query.userId) throw new HttpError({ statusCode: 403, message: "ADMIN required" });
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    return userIds;
  }
  // Return all memberships for ADMIN, limit to current user to non-admins
  return isAdmin ? undefined : [userId];
}

/**
 * Returns requested teams IDs only if admin
 */
function getTeamIds(req: NextApiRequest) {
  const { isAdmin } = req;
  /** Only admins can query other teams */
  if (!isAdmin && req.query.teamId) throw new HttpError({ statusCode: 403, message: "ADMIN required" });
  if (isAdmin && req.query.teamId) {
    const query = schemaQuerySingleOrMultipleTeamIds.parse(req.query);
    const teamIds = Array.isArray(query.teamId) ? query.teamId : [query.teamId];
    return teamIds;
  }
  return undefined;
}

export default defaultResponder(getHandler);
