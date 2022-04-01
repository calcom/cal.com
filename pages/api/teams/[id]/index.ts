import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { TeamResponse } from "@lib/types";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";
import { schemaTeamPublic } from "@lib/validations/team";

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: find team by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the team to get
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
export async function teamById(req: NextApiRequest, res: NextApiResponse<TeamResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const team = await prisma.team.findUnique({ where: { id: safe.data.id } });
  const data = schemaTeamPublic.parse(team);

  if (team) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Team was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(teamById));
