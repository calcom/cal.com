import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { EventTypesResponse } from "@lib/types";
import { schemaEventTypePublic } from "@lib/validations/event-type";

/**
 * @swagger
 * /api/eventTypes:
 *   get:
 *     summary: Returns all eventTypes
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No eventTypes were found
 */
async function allEventTypes(_: NextApiRequest, res: NextApiResponse<EventTypesResponse>) {
  const eventTypes = await prisma.eventType.findMany();
  const data = eventTypes.map((eventType) => schemaEventTypePublic.parse(eventType));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No EventTypes were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allEventTypes);
