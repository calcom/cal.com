import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaEventTypeReadPublic } from "~/lib/validations/event-type";
import { schemaQuerySlug } from "~/lib/validations/shared/querySlug";

import { checkPermissions } from "../../[id]/_get";
import getCalLink from "../../_utils/getCalLink";

/**
 * @swagger
 * /event-types/by-slug/{slug}:
 *   get:
 *     operationId: getEventTypeBySlug
 *     summary: Find an eventType by slug
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: slug
 *        example: 30min
 *        schema:
 *          type: string
 *        required: true
 *        description: Slug of the eventType to get
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
  const { userId, prisma, query } = req;
  const { slug } = schemaQuerySlug.parse(query);

  const eventType = await prisma.eventType.findFirst({
    where: { slug, users: { some: { id: userId } } },
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

  return { event_type: schemaEventTypeReadPublic.parse({ ...eventType, link }) };
}

export default defaultResponder(getHandler);
