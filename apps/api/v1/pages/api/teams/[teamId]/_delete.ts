import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";

import { checkPermissions } from "./_auth-middleware";

/**
 * @swagger
 * /teams/{teamId}:
 *   delete:
 *     operationId: removeTeamById
 *     summary: Remove an existing team
 *     parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the team to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team removed successfully
 *       400:
 *        description: Bad request. Team id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { teamId } = schemaQueryTeamId.parse(query);
  await checkPermissions(req);
  await prisma.team.delete({ where: { id: teamId } });
  return { message: `Team with id: ${teamId} deleted successfully` };
}

export default defaultResponder(deleteHandler);
