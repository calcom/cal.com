import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryTeamId } from "@lib/validations/shared/queryTeamId";
import { schemaTeamReadPublic } from "@lib/validations/team";

/**
 * @swagger
 * /teams/{teamId}:
 *   get:
 *     operationId: getTeamById
 *     summary: Find a team
 *     parameters:
 *       - in: path
 *         name: teamId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the team to get
 *     tags:
 *     - teams
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Team was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, isAdmin, userId } = req;

  const query = schemaQueryTeamId.parse(req.query);
  const userWithMemberships = await prisma.membership.findMany({
    where: { userId: userId },
  });
  const userTeamIds = userWithMemberships.map((membership) => membership.teamId);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && !userTeamIds.includes(query.teamId))
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  const data = await prisma.team.findUnique({ where: { id: query.teamId } });
  const team = schemaTeamReadPublic.parse(data);
  return { team };
}

export default defaultResponder(getHandler);
