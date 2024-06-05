import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemaEventTypeReadPublic } from "~/lib/validations/event-type";

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
 *        url: https://docs.cal.com/core-features/event-types
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
    include: {
      customInputs: true,
      team: { select: { slug: true } },
      hosts: { select: { userId: true, isFixed: true } },
      owner: { select: { username: true, id: true } },
      children: { select: { id: true, userId: true } },
    },
  };

  const data = await prisma.eventType.findMany(args);
  return { event_types: data.map((eventType) => schemaEventTypeReadPublic.parse(eventType)) };
}

export default defaultResponder(getHandler);
