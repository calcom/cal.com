import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryTeamId } from "@lib/validations/shared/queryTeamId";
import { schemaTeamReadPublic, schemaTeamUpdateBodyParams } from "@lib/validations/team";

/**
 * @swagger
 * /teams/{teamId}:
 *   patch:
 *     operationId: editTeamById
 *     summary: Edit an existing team
 *     parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the team to edit
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team edited successfully
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, body, userId } = req;
  const data = schemaTeamUpdateBodyParams.parse(body);
  const { teamId } = schemaQueryTeamId.parse(req.query);
  /** Only OWNERS and ADMINS can edit teams */
  const _team = await prisma.team.findFirst({
    where: { id: teamId, members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
  });
  if (!_team) throw new HttpError({ statusCode: 401, message: "Unauthorized: OWNER or ADMIN required" });
  const team = await prisma.team.update({ where: { id: teamId }, data });
  return { team: schemaTeamReadPublic.parse(team) };
}

export default defaultResponder(patchHandler);
