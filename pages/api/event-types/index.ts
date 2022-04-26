import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeResponse, EventTypesResponse } from "@lib/types";
import { schemaEventTypeBodyParams, schemaEventTypePublic } from "@lib/validations/event-type";

/**
 * @swagger
 * /event-types:
 *   get:
 *     summary: Get all event types
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No event types were found
 *   post:
 *     summary: Creates a new event type
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       201:
 *         description: OK, event type created
 *         model: EventType
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllEventTypes(
  req: NextApiRequest,
  res: NextApiResponse<EventTypesResponse | EventTypeResponse>
) {
  const { method } = req;
  const userId = req.userId;

  if (method === "GET") {
    const data = await prisma.eventType.findMany({ where: { userId } });
    const event_types = data.map((eventType) => schemaEventTypePublic.parse(eventType));
    if (event_types) res.status(200).json({ event_types });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No EventTypes were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaEventTypeBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.eventType.create({ data: { ...safe.data, userId } });
    const event_type = schemaEventTypePublic.parse(data);

    if (data) res.status(201).json({ event_type, message: "EventType created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new event type",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllEventTypes);
