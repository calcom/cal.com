import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaTeamReadPublic } from "@lib/validations/team";

import { Prisma } from ".prisma/client";

/**
 * @swagger
 * /teams:
 *   get:
 *     operationId: listTeams
 *     summary: Find all teams
 *     tags:
 *     - teams
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No teams were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const membershipWhere: Prisma.MembershipWhereInput = {};
  // If user is not ADMIN, return only his data.
  if (!isAdmin) membershipWhere.userId = userId;
  const userWithMemberships = await prisma.membership.findMany({
    where: membershipWhere,
  });
  const teamIds = userWithMemberships.map((membership) => membership.teamId);
  const teamWhere: Prisma.TeamWhereInput = {};

  if (!isAdmin) teamWhere.id = { in: teamIds };

  const data = await prisma.team.findMany({ where: teamWhere });
  const teams = schemaTeamReadPublic.parse(data);
  return { teams };
}

export default defaultResponder(getHandler);
