import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeResponse } from "@lib/types";
import {
  schemaEventTypeBodyParams,
  schemaEventTypePublic,
  withValidEventType,
} from "@lib/validations/event-type";

/**
 * @swagger
 * /api/eventTypes/new:
 *   post:
 *     summary: Creates a new eventType
 *     responses:
 *       201:
 *         description: OK, eventType created
 *         model: EventType
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createEventType(req: NextApiRequest, res: NextApiResponse<EventTypeResponse>) {
  const safe = schemaEventTypeBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const eventType = await prisma.eventType.create({ data: safe.data });
  const data = schemaEventTypePublic.parse(eventType);

  if (data) res.status(201).json({ data, message: "EventType created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new eventType",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidEventType(createEventType));
