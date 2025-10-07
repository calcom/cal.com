import type { NextApiRequest } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { eventTypeSelect } from "~/lib/selects/event-type";

const querySchema = z.object({
  teamId: z.coerce.number(),
});

/**
 * @swagger
 * /teams/{teamId}/event-types:
 *   get:
 *     summary: Find all event types that belong to teamId
 *     operationId: listEventTypesByTeamId
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: number
 *        required: true
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/event-types
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: No event types were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;

  const { teamId } = querySchema.parse(req.query);

  const args: Prisma.EventTypeFindManyArgs = {
    where: {
      team: isSystemWideAdmin
        ? {
            id: teamId,
          }
        : {
            id: teamId,
            members: { some: { userId } },
          },
    },
    select: eventTypeSelect,
  };
  return {
    event_types: await prisma.eventType.findMany(args),
  };
}

export default defaultResponder(getHandler);
