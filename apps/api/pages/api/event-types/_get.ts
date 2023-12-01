import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import type { PrismaClient } from "@calcom/prisma";

import { schemaEventTypeReadPublic } from "~/lib/validations/event-type";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

import getCalLink from "./_utils/getCalLink";

/**
 * @swagger
 * /event-types:
 *   get:
 *     summary: Find all event types
 *     operationId: listEventTypes
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
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
 *         description: No event types were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, prisma } = req;
  const userIds = req.query.userId ? extractUserIdsFromQuery(req) : [userId];
  const data = await prisma.eventType.findMany({
    where: {
      userId: { in: userIds },
    },
    include: {
      customInputs: true,
      team: { select: { slug: true } },
      users: true,
      hosts: { select: { userId: true, isFixed: true } },
      owner: { select: { username: true, id: true } },
      children: { select: { id: true, userId: true } },
    },
  });
  // this really should return [], but backwards compatibility..
  if (data.length === 0) new HttpError({ statusCode: 404, message: "No event types were found" });
  return {
    event_types: (await defaultScheduleId<(typeof data)[number]>({ eventTypes: data, prisma, userIds })).map(
      (eventType) => {
        const link = getCalLink(eventType);
        return schemaEventTypeReadPublic.parse({ ...eventType, link });
      }
    ),
  };
}
// TODO: Extract & reuse.
function extractUserIdsFromQuery({ isAdmin, query }: NextApiRequest) {
  /** Guard: Only admins can query other users */
  if (!isAdmin) {
    throw new HttpError({ statusCode: 401, message: "ADMIN required" });
  }
  const { userId: userIdOrUserIds } = schemaQuerySingleOrMultipleUserIds.parse(query);
  return Array.isArray(userIdOrUserIds) ? userIdOrUserIds : [userIdOrUserIds];
}

type DefaultScheduleIdEventTypeBase = {
  scheduleId: number | null;
  userId: number | null;
};
// If an eventType is given w/o a scheduleId
// Then we associate the default user schedule id to the eventType
async function defaultScheduleId<T extends DefaultScheduleIdEventTypeBase>({
  prisma,
  eventTypes,
  userIds,
}: {
  prisma: PrismaClient;
  eventTypes: (T & Partial<Omit<T, keyof DefaultScheduleIdEventTypeBase>>)[];
  userIds: number[];
}) {
  // there is no event types without a scheduleId, skip the user query
  if (eventTypes.every((eventType) => eventType.scheduleId)) return eventTypes;

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      defaultScheduleId: true,
    },
  });

  if (!users.length) {
    return eventTypes;
  }

  const defaultScheduleIds = users.reduce((result, user) => {
    result[user.id] = user.defaultScheduleId;
    return result;
  }, {} as { [x: number]: number | null });

  return eventTypes.map((eventType) => {
    // realistically never happens, userId should't be null on personal event types.
    if (!eventType.userId) return eventType;
    return {
      ...eventType,
      scheduleId: eventType.scheduleId || defaultScheduleIds[eventType.userId],
    };
  });
}

export default defaultResponder(getHandler);
