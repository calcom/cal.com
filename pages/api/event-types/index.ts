import type { NextApiRequest, NextApiResponse } from "next";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeResponse, EventTypesResponse } from "@lib/types";
import { schemaEventTypeCreateBodyParams, schemaEventTypeReadPublic } from "@lib/validations/event-type";

async function createOrlistAllEventTypes(
  { method, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<EventTypesResponse | EventTypeResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /event-types:
     *   get:
     *     summary: Find all event types
     *     operationId: listEventTypes
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
    if (!isAdmin) {
      const data = await prisma.user
        .findUnique({
          where: { id: userId },
          rejectOnNotFound: true,
          select: { eventTypes: true },
        })
        .catch((error) => res.status(404).json({ message: "No event types were found", error }));
      // @todo: add validations back schemaReadEventType.parse
      if (data) res.status(200).json({ event_types: data.eventTypes });
      else
        (error: Error) =>
          res.status(404).json({
            message: "No EventTypes were found",
            error,
          });
    } else {
      const data = await prisma.eventType.findMany({});
      const event_types = data.map((eventType) => schemaEventTypeReadPublic.parse(eventType));
      if (event_types) res.status(200).json({ event_types });
    }
  } else if (method === "POST") {
    /**
     * @swagger
     * /event-types:
     *   post:
     *     summary: Creates a new event type
     *     operationId: addEventType
     *     requestBody:
     *       description: Create a new event-type related to your user or team
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - title
     *               - slug
     *               - length
     *               - metadata
     *             properties:
     *               length:
     *                 type: number
     *                 example: 30
     *               metadata:
     *                 type: object
     *                 example: {"smartContractAddress": "0x1234567890123456789012345678901234567890"}
     *               title:
     *                 type: string
     *                 example: My Event
     *               slug:
     *                 type: string
     *                 example: my-event
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
    if (!safe.success) {
      res.status(400).json({ message: "Invalid request body", error: safe.error });
      return;
    }
    if (!isAdmin) {
      const data = await prisma.eventType.create({
        data: {
          ...safe.data,
          userId,
          users: {
            connect: {
              id: userId,
            },
          },
        },
      });
      const event_type = schemaEventTypeReadPublic.parse(data);
      if (data) res.status(201).json({ event_type, message: "EventType created successfully" });
    } else {
      // if admin don't re-set userId from input
      const data = await prisma.eventType.create({
        data: {
          ...safe.data,
          ...(!safe.data.userId && { userId }),
          users: {
            connect: {
              id: safe.data.userId || userId,
            },
          },
        },
      });
      const event_type = schemaEventTypeReadPublic.parse(data);
      if (data) res.status(201).json({ event_type, message: "EventType created successfully" });
    }
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllEventTypes);
