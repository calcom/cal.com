import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryTeamId } from "@lib/validations/shared/queryTeamId";
import { schemaTeamBodyParams, schemaTeamReadPublic } from "@lib/validations/team";

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
 *         description: OK, team edited successfuly
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest, res: NextApiResponse) {
  const { prisma, isAdmin, userId, body } = req;
  const safeBody = schemaTeamBodyParams.safeParse(body);

  const query = schemaQueryTeamId.parse(req.query);
  const userWithMemberships = await prisma.membership.findMany({
    where: { userId: userId },
  });
  const userTeamIds = userWithMemberships.map((membership) => membership.teamId);
  // Here we only check for ownership of the user if the user is not admin, otherwise we let ADMIN's edit any user
  if (!isAdmin || !userTeamIds.includes(query.teamId))
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  if (!safeBody.success) {
    {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }
  }
  const data = await prisma.team.update({ where: { id: query.teamId }, data: safeBody.data });
  if (!data) throw new HttpError({ statusCode: 404, message: `Team with id: ${query.teamId} not found` });
  const team = schemaTeamReadPublic.parse(data);
  if (!team) throw new HttpError({ statusCode: 401, message: `Your request body wasn't valid` });
  return { team };
}

export default defaultResponder(patchHandler);
