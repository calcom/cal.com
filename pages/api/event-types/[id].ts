import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeResponse } from "@lib/types";
import { schemaEventTypeBodyParams, schemaEventTypePublic } from "@lib/validations/event-type";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /event-types/{id}:
 *   get:
 *     summary: Find a eventType by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the eventType to get
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
 *         description: EventType was not found
 *   patch:
 *     summary: Edit an existing eventType
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: eventType
 *        description: The eventType to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/EventType'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the eventType to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       201:
 *         description: OK, eventType edited successfuly
 *         model: EventType
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing eventType
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the eventType to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       201:
 *         description: OK, eventType removed successfuly
 *         model: EventType
 *       400:
 *        description: Bad request. EventType id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function eventTypeById(req: NextApiRequest, res: NextApiResponse<EventTypeResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaEventTypeBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const data = await prisma.eventType.findMany({ where: { userId } });
  const userEventTypes = data.map((eventType) => eventType.id);
  if (!userEventTypes.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.eventType
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaEventTypePublic.parse(data))
          .then((event_type) => res.status(200).json({ event_type }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.eventType
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaEventTypePublic.parse(data))
          .then((event_type) => res.status(200).json({ event_type }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.eventType
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `EventType with id: ${safeQuery.data.id} deleted`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(eventTypeById));
