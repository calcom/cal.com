import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { purchaseTeamSubscription } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { TRPCError } from "@trpc/server";

import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";
import { schemaTeamReadPublic, schemaTeamUpdateBodyParams } from "~/lib/validations/team";

/**
 * @swagger
 * /teams/{teamId}:
 *   patch:
 *     operationId: editTeamById
 *     summary: Edit an existing team
 *     parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the team to edit
 *     tags:
 *     - teams
 *     responses:
 *       201:
 *         description: OK, team edited successfully
 *       400:
 *        description: Bad request. Team body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, body, userId } = req;
  const data = schemaTeamUpdateBodyParams.parse(body);
  const { teamId } = schemaQueryTeamId.parse(req.query);
  /** Only OWNERS and ADMINS can edit teams */
  const _team = await prisma.team.findFirst({
    include: { members: true },
    where: { id: teamId, members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
  });
  if (!_team) throw new HttpError({ statusCode: 401, message: "Unauthorized: OWNER or ADMIN required" });
  let paymentUrl;
  if (_team.slug === null && data.slug) {
    data.metadata = {
      ...(_team.metadata as Prisma.JsonObject),
      requestedSlug: data.slug,
    };
    delete data.slug;
    if (IS_TEAM_BILLING_ENABLED) {
      const checkoutSession = await purchaseTeamSubscription({
        teamId: _team.id,
        seats: _team.members.length,
        userId,
      });
      if (!checkoutSession.url)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed retrieving a checkout session URL.",
        });
      paymentUrl = checkoutSession.url;
    }
  }

  // TODO: Perhaps there is a better fix for this?
  const cloneData: typeof data & {
    metadata: NonNullable<typeof data.metadata> | undefined;
  } = {
    ...data,
    metadata: data.metadata === null ? {} : data.metadata || undefined,
  };
  const team = await prisma.team.update({ where: { id: teamId }, data: cloneData });
  const result = {
    team: schemaTeamReadPublic.parse(team),
    paymentUrl,
  };
  if (!paymentUrl) {
    delete result.paymentUrl;
  }
  return result;
}

export default defaultResponder(patchHandler);
