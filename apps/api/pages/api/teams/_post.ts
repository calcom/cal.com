import type { NextApiRequest } from "next";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { generateCheckoutSession } from "@calcom/trpc/server/routers/viewer/teams/create.handler";

import { schemaTeamCreateBodyParams } from "~/lib/validations/team";

/**
 * @swagger
 * /teams:
 *   post:
 *     operationId: addTeam
 *     summary: Creates a new team
 *     parameters:
 *        - in: query
 *          name: apiKey
 *          required: true
 *          schema:
 *            type: string
 *          description: Your API key
 *     requestBody:
 *        description: Create a new custom input for an event type
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              required:
 *                - name
 *                - slug
 *                - hideBookATeamMember
 *                - brandColor
 *                - darkBrandColor
 *                - timeZone
 *                - weekStart
 *                - isPrivate
 *              properties:
 *                name:
 *                  type: string
 *                  description: Name of the team
 *                slug:
 *                  type: string
 *                  description: A unique slug that works as path for the team public page
 *                hideBookATeamMember:
 *                  type: boolean
 *                  description: Flag to hide or show the book a team member option
 *                brandColor:
 *                  type: string
 *                  description: Primary brand color for the team
 *                darkBrandColor:
 *                  type: string
 *                  description: Dark variant of the primary brand color for the team
 *                timeZone:
 *                  type: string
 *                  description: Time zone of the team
 *                weekStart:
 *                  type: string
 *                  description: Starting day of the week for the team
 *                isPrivate:
 *                  type: boolean
 *                  description: Flag indicating if the team is private
 *                ownerId:
 *                  type: number
 *                  description: ID of the team owner - only admins can set this and it is a required field for admins.
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
  const { prisma, body, userId, isAdmin } = req;
  const { ownerId, ...team } = schemaTeamCreateBodyParams.parse(body);

  await checkPermissions(req);

  const effectiveUserId = isAdmin && ownerId ? ownerId : userId;

  if (team.slug) {
    const alreadyExist = await prisma.team.findFirst({
      where: {
        slug: team.slug,
      },
    });
    if (alreadyExist) throw new HttpError({ statusCode: 409, message: "Team slug already exists" });
  }

  // Check if parentId is related to this user
  if (team.parentId) {
    const parentTeam = await prisma.team.findFirst({
      where: { id: team.parentId, members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
    });
    if (!parentTeam)
      throw new HttpError({
        statusCode: 401,
        message: "Unauthorized: Invalid parent id. You can only use parent id of your own teams.",
      });
  }

  if (!IS_TEAM_BILLING_ENABLED) {
    const PRECONDITION_FAILED_STATUS_CODE = 412;
    throw new HttpError({
      statusCode: PRECONDITION_FAILED_STATUS_CODE,
      message: "Team creation is currently unavailable as team billing is disabled.",
    });
  }

  const checkoutSessionResponse = await generateCheckoutSession({
    ...team,
    ownerId: effectiveUserId,
  });

  return checkoutSessionResponse;
}

async function checkPermissions(req: NextApiRequest) {
  const { isAdmin } = req;
  const body = schemaTeamCreateBodyParams.parse(req.body);

  /* Non-admin users can only create teams for themselves */
  if (!isAdmin && body.ownerId)
    throw new HttpError({
      statusCode: 401,
      message: "ADMIN required for `ownerId`",
    });

  /* Admin users are required to pass in a userId */
  if (isAdmin && !body.ownerId)
    throw new HttpError({ statusCode: 400, message: "`ownerId` required for ADMIN" });
}

export default defaultResponder(postHandler);
