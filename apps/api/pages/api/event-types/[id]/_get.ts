import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { MembershipRole } from "@calcom/prisma/enums";

import { schemaEventTypeReadPublic } from "~/lib/validations/event-type";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";
import { checkPermissions as canAccessTeamEventOrThrow } from "~/pages/api/teams/[teamId]/_auth-middleware";

import getCalLink from "../_utils/getCalLink";

/**
 * @swagger
 * /event-types/{id}:
 *   get:
 *     operationId: getEventTypeById
 *     summary: Find a eventType
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: id
 *        example: 4
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventType to get
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/core-features/event-types
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: EventType was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const eventType = await prisma.eventType.findUnique({
    where: { id },
    include: {
      customInputs: true,
      team: { select: { slug: true } },
      users: true,
      hosts: { select: { userId: true, isFixed: true } },
      owner: { select: { username: true, id: true } },
      children: { select: { id: true, userId: true } },
    },
  });
  await checkPermissions(req, eventType);

  const link = eventType ? getCalLink(eventType) : null;
  // user.defaultScheduleId doesn't work the same for team events.
  if (!eventType?.scheduleId && eventType?.userId && !eventType?.teamId) {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: eventType.userId,
      },
      select: {
        defaultScheduleId: true,
      },
    });
    eventType.scheduleId = user.defaultScheduleId;
  }

  // TODO: eventType when not found should be a 404
  //       but API consumers may depend on the {} behaviour.
  return { event_type: schemaEventTypeReadPublic.parse({ ...eventType, link }) };
}

type BaseEventTypeCheckPermissions = {
  userId: number | null;
  teamId: number | null;
};

async function checkPermissions<T extends BaseEventTypeCheckPermissions>(
  req: NextApiRequest,
  eventType: (T & Partial<Omit<T, keyof BaseEventTypeCheckPermissions>>) | null
) {
  if (req.isAdmin) return true;
  if (eventType?.teamId) {
    req.query.teamId = String(eventType.teamId);
    await canAccessTeamEventOrThrow(req, {
      in: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
    });
  }
  if (eventType?.userId === req.userId) return true; // is owner.
  throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default defaultResponder(getHandler);
