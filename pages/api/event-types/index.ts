import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeResponse, EventTypesResponse } from "@lib/types";
import { schemaEventTypeCreateBodyParams, schemaEventTypeReadPublic } from "@lib/validations/event-type";

async function createOrlistAllEventTypes(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<EventTypesResponse | EventTypeResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /event-types:
     *   get:
     *     summary: Find all event types
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
     */
    const data = await prisma.eventType.findMany({ where: { userId } });
    const event_types = data.map((eventType) => schemaEventTypeReadPublic.parse(eventType));
    if (event_types) res.status(200).json({ event_types });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No EventTypes were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /event-types:
     *   post:
     *     summary: Creates a new event type
     *     tags:
     *     - event-types
     *     externalDocs:
     *        url: https://docs.cal.com/event-types
     *     responses:
     *       201:
     *         description: OK, event type created
     *       400:
     *        description: Bad request. EventType body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaEventTypeCreateBodyParams.safeParse(body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.eventType.create({ data: { ...safe.data, userId } });
    const event_type = schemaEventTypeReadPublic.parse(data);

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
