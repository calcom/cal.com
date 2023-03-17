import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

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
  const { userId, isAdmin, prisma } = req;

  const args: Prisma.EventTypeFindManyArgs = {
    where: { userId },
  };
  /** Only admins can query other users */
  if (!isAdmin && req.query.userId) throw new HttpError({ statusCode: 401, message: "ADMIN required" });
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    args.where = { userId: { in: userIds } };
  }
  const data = await prisma.eventType.findMany({
    ...args,
    include: {
      customInputs: true,
      team: { select: { slug: true } },
      users: true,
      owner: { select: { username: true, id: true } },
    },
  });
  return {
    event_types: data.map((eventType) => {
      const link = getCalLink(eventType);
      return schemaEventTypeReadPublic.parse({ ...eventType, link });
    }),
  };
}

export default defaultResponder(getHandler);
