import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { TeamResponse } from "@lib/types";
import { schemaTeamBodyParams, schemaTeamPublic, withValidTeam } from "@lib/validations/team";

/**
 * @swagger
 * /api/teams/new:
 *   post:
 *     description: Creates a new team
 *     responses:
 *       201:
 *         description: OK, team created
 *         model: Team
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createTeam(req: NextApiRequest, res: NextApiResponse<TeamResponse>) {
  const safe = schemaTeamBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const team = await prisma.team.create({ data: safe.data });
  const data = schemaTeamPublic.parse(team);

  if (data) res.status(201).json({ data, message: "Team created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new team",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidTeam(createTeam));
