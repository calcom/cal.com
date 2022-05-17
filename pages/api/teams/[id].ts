import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { TeamResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaTeamBodyParams, schemaTeamPublic } from "@lib/validations/team";

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     operationId: getTeamById
 *     summary: Find a team
 *     parameters:
 *       - in: path
 *         name: id
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
 *   patch:
 *     operationId: editTeamById
 *     summary: Edit an existing team
 *     parameters:
 *      - in: path
 *        name: id
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
 *   delete:
 *     operationId: removeTeamById
 *     summary: Remove an existing team
 *     parameters:
 *      - in: path
 *        name: id
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
export async function teamById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<TeamResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaTeamBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userWithMemberships = await prisma.membership.findMany({
    where: { userId: userId },
  });
  //FIXME: This is a hack to get the teamId from the user's membership
  console.log(userWithMemberships);
  const userTeamIds = userWithMemberships.map((membership) => membership.teamId);
  if (!userTeamIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.team
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaTeamPublic.parse(data))
          .then((team) => res.status(200).json({ team }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Team with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
        }
        await prisma.team
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((team) => schemaTeamPublic.parse(team))
          .then((team) => res.status(200).json({ team }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Team with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.team
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Team with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Team with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(teamById));
