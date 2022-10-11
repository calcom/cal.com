import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryTeamId } from "@lib/validations/shared/queryTeamId";

/**
 * @swagger
 * /users/{teamId}:
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
  const { prisma, query, userId } = req;
  const { teamId } = schemaQueryTeamId.parse(query);
  /** Only OWNERS can delete teams */
  const _team = await prisma.team.findFirst({
    where: { id: teamId, members: { some: { userId, role: "OWNER" } } },
  });
  if (!_team) throw new HttpError({ statusCode: 401, message: "Unauthorized: OWNER required" });
  await prisma.team.delete({ where: { id: teamId } });
  return { message: `Team with id: ${teamId} deleted successfully` };
}

export default defaultResponder(deleteHandler);
