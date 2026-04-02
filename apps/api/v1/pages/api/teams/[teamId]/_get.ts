import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";
import { schemaTeamReadPublic } from "~/lib/validations/team";

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
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
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
  const { isSystemWideAdmin, userId } = req;
  const { teamId } = schemaQueryTeamId.parse(req.query);
  const where: Prisma.TeamWhereInput = { id: teamId };
  // Non-admins can only query the teams they're part of
  if (!isSystemWideAdmin) where.members = { some: { userId } };
  const data = await prisma.team.findFirstOrThrow({ where });
  return { team: schemaTeamReadPublic.parse(data) };
}

export default defaultResponder(getHandler);
