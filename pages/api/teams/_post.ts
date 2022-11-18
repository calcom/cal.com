import type { NextApiRequest } from "next";

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
  const data = schemaTeamBodyParams.parse(body);
  // TODO: Perhaps there is a better fix for this?
  const cloneData: typeof data & {
    metadata: NonNullable<typeof data.metadata> | undefined;
  } = {
    ...data,
    metadata: data.metadata === null ? {} : data.metadata || undefined,
  };
  const team = await prisma.team.create({
    data: {
      ...cloneData,
      members: {
        // We're also creating the relation membership of team ownership in this call.
        create: { userId, role: "OWNER", accepted: true },
      },
    },
    include: { members: true },
  });
  req.statusCode = 201;
  // We are also returning the new ownership relation as owner besides team.
  return {
    team: schemaTeamReadPublic.parse(team),
    owner: schemaMembershipPublic.parse(team.members[0]),
    message: "Team created successfully, we also made you the owner of this team",
  };
}

export default defaultResponder(postHandler);
