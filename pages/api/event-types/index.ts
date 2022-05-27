import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypeResponse, EventTypesResponse } from "@lib/types";
import { schemaEventTypeCreateBodyParams, schemaEventTypeReadPublic } from "@lib/validations/event-type";

async function createOrlistAllEventTypes(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<EventTypesResponse | EventTypeResponse>
) {
  console.log("userId:", userId);
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
    const data = await prisma.user
      .findUnique({
        where: { id: userId },
        rejectOnNotFound: true,
        select: { eventTypes: true },
      })
      .catch((error) => res.status(404).json({ message: "No event types were found", error }));
    if (data) res.status(200).json({ event_types: data.eventTypes });

    console.log(`userid is: ${userId}`, "eventTypes:", data);
    // const event_types = data.map(
    //   async (eventType) => await schemaEventTypeReadPublic.safeParseAsync(eventType)
    // );
    if (data) res.status(200).json({ event_types: data.eventTypes });
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
