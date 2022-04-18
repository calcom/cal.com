import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { TeamResponse, TeamsResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaTeamBodyParams, schemaTeamPublic, withValidTeam } from "@lib/validations/team";

/**
 * @swagger
 * /v1/teams:
 *   get:
 *     summary: Get all teams
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - teams
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No teams were found
 *   post:
 *     summary: Creates a new team
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team created
 *         model: Team
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllTeams(req: NextApiRequest, res: NextApiResponse<TeamsResponse | TeamResponse>) {
  const { method } = req;
  const userId = getCalcomUserId(res);
  if (method === "GET") {
    const userWithMemberships = await prisma.membership.findMany({
      where: { userId: userId },
    });
    const teamIds = userWithMemberships.map((membership) => membership.teamId);
    const teams = await prisma.team.findMany({ where: { id: { in: teamIds } } });
    if (teams) res.status(200).json({ teams });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Teams were found",
          error,
        });
  } else if (method === "POST") {
    // FIXME: add userId as owner of the team
    const safe = schemaTeamBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");
    const team = await prisma.team.create({ data: safe.data });
    const membership = await prisma.membership.create({
      data: { userId, teamId: team.id, role: "ADMIN" },
    });
    console.log(membership);
    const data = schemaTeamPublic.parse(team);

    if (data) res.status(201).json({ team: data, message: "Team created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new team",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllTeams);
