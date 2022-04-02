import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { TeamsResponse } from "@lib/types";
import { schemaTeamPublic } from "@lib/validations/team";

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Returns all teams
 *     tags:
 *     - teams
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No teams were found
 */
async function allTeams(_: NextApiRequest, res: NextApiResponse<TeamsResponse>) {
  const teams = await prisma.team.findMany();
  const data = teams.map((team) => schemaTeamPublic.parse(team));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Teams were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allTeams);
