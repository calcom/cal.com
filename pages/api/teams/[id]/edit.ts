import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { TeamResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaTeamBodyParams, schemaTeamPublic, withValidTeam } from "@lib/validations/team";

/**
 * @swagger
 * /api/teams/:id/edit:
 *   patch:
 *     summary: Edits an existing team
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team edited successfuly
 *         model: Team
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editTeam(req: NextApiRequest, res: NextApiResponse<TeamResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaTeamBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const team = await prisma.team.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaTeamPublic.parse(team);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(withValidQueryIdTransformParseInt(withValidTeam(editTeam)));
