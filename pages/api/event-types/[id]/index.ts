import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeResponse } from "@lib/types";
import { schemaEventTypePublic } from "@lib/validations/eventType";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/eventTypes/{id}:
 *   get:
 *     summary: find eventType by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the event type to get
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: EventType was not found
 */
export async function eventTypeById(req: NextApiRequest, res: NextApiResponse<EventTypeResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const eventType = await prisma.eventType.findUnique({ where: { id: safe.data.id } });
  const data = schemaEventTypePublic.parse(eventType);

  if (eventType) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "EventType was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(eventTypeById));
