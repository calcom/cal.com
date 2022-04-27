import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { TeamResponse, TeamsResponse } from "@lib/types";
import { schemaMembershipPublic } from "@lib/validations/membership";
import { schemaTeamBodyParams, schemaTeamPublic } from "@lib/validations/team";

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Find all teams
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
  const userId = req.userId;
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
    const safe = schemaTeamBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");
    const team = await prisma.team.create({ data: safe.data });
    // We're also creating the relation membership of team ownership in this call.
    const membership = await prisma.membership
      .create({
        data: { userId, teamId: team.id, role: "OWNER", accepted: true },
      })
      .then((membership) => schemaMembershipPublic.parse(membership));
    const data = schemaTeamPublic.parse(team);
    // We are also returning the new ownership relation as owner besides team.
    if (data)
      res.status(201).json({
        team: data,
        owner: membership,
        message: "Team created successfully, we also made you the owner of this team",
      });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new team",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllTeams);
