import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaEventTypeReadPublic } from "~/lib/validations/event-type";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

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
  const event_type = await prisma.eventType.findUnique({
    where: { id },
    include: {
      customInputs: true,
      team: { select: { slug: true } },
      users: true,
      owner: { select: { username: true, id: true } },
    },
  });

  const link = event_type ? getCalLink(event_type) : null;

  return { event_type: schemaEventTypeReadPublic.parse({ ...event_type, link }) };
}

export default defaultResponder(getHandler);
