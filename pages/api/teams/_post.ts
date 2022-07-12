import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaMembershipPublic } from "@lib/validations/membership";
import { schemaTeamBodyParams, schemaTeamReadPublic } from "@lib/validations/team";

/**
 * @swagger
 * /teams:
 *   post:
 *     operationId: addTeam
 *     summary: Creates a new team
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team created
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { prisma, body, userId } = req;
  const safe = schemaTeamBodyParams.safeParse(body);
  if (!safe.success) throw new HttpError({ statusCode: 400, message: "Invalid request body" });
  const data = await prisma.team.create({ data: safe.data });
  // We're also creating the relation membership of team ownership in this call.
  const owner = await prisma.membership
    .create({
      data: { userId, teamId: data.id, role: "OWNER", accepted: true },
    })
    .then((owner) => schemaMembershipPublic.parse(owner));
  const team = schemaTeamReadPublic.parse(data);
  if (!team) throw new HttpError({ statusCode: 400, message: "We were not able to create your team" });
  req.statusCode = 201;
  // We are also returning the new ownership relation as owner besides team.
  return {
    team,
    owner,
    message: "Team created successfully, we also made you the owner of this team",
  };
}

export default defaultResponder(postHandler);
