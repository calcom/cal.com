import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { eventTypeSelect } from "~/lib/selects/event-type";
import { schemaQuerySlug } from "~/lib/validations/shared/querySlug";
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
 *      - in: query
 *        name: slug
 *        schema:
 *          type: string
 *        required: false
 *        description: Slug to filter event types by
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/event-types
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No event types were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const userIds = req.query.userId ? extractUserIdsFromQuery(req) : [userId];
  const { slug } = schemaQuerySlug.parse(req.query);
  const shouldUseUserId = !isSystemWideAdmin || !slug || !!req.query.userId;
  // When user is admin and no query params are provided we should return all event types.
  // But currently we return only the event types of the user. Not changing this for backwards compatibility.
  const data = await prisma.eventType.findMany({
    where: {
      userId: shouldUseUserId ? { in: userIds } : undefined,
      slug: slug, // slug will be undefined if not provided in query
    },
    select: eventTypeSelect,
  });
  // this really should return [], but backwards compatibility..
  if (data.length === 0) new HttpError({ statusCode: 404, message: "No event types were found" });
  return {
    event_types: (await defaultScheduleId<(typeof data)[number]>({ eventTypes: data, prisma, userIds })).map(
      (eventType) => {
        const link = getCalLink(eventType);
        return { ...eventType, link };
      }
    ),
  };
}
// TODO: Extract & reuse.
function extractUserIdsFromQuery({ isSystemWideAdmin, query }: NextApiRequest) {
  /** Guard: Only admins can query other users */
  if (!isSystemWideAdmin) {
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

  const defaultScheduleIds = users.reduce(
    (result, user) => {
      result[user.id] = user.defaultScheduleId;
      return result;
    },
    {} as { [x: number]: number | null }
  );

  return eventTypes.map((eventType) => {
    // realistically never happens, userId shouldn't be null on personal event types.
    if (!eventType.userId) return eventType;
    return {
      ...eventType,
      scheduleId: eventType.scheduleId || defaultScheduleIds[eventType.userId],
    };
  });
}

export default defaultResponder(getHandler);
