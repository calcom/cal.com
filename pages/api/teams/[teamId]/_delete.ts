import type { NextApiRequest, NextApiResponse } from "next";

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
 *         description: OK, team removed successfuly
 *       400:
 *        description: Bad request. Team id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
  const { prisma, isAdmin, userId } = req;

  const query = schemaQueryTeamId.parse(req.query);
  const userWithMemberships = await prisma.membership.findMany({
    where: { userId: userId },
  });
  const userTeamIds = userWithMemberships.map((membership) => membership.teamId);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin && !userTeamIds.includes(query.teamId))
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  await prisma.team
    .delete({ where: { id: query.teamId } })
    .then(() =>
      res.status(200).json({
        message: `Team with id: ${query.teamId} deleted successfully`,
      })
    )
    .catch((error: Error) =>
      res.status(404).json({
        message: `Team with id: ${query.teamId} not found`,
        error,
      })
    );
}

export default defaultResponder(deleteHandler);
