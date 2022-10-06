import type { NextApiRequest, NextApiResponse } from "next";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeResponse } from "@lib/types";
import { schemaEventTypeEditBodyParams, schemaEventTypeReadPublic } from "@lib/validations/event-type";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function eventTypeById(
  { method, query, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<EventTypeResponse>
) {
  if (body.userId && !isAdmin) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query was invalid" });
    return;
  }
  const data = await prisma.user.findUnique({
    where: { id: body.userId || userId },
    rejectOnNotFound: true,
    select: { eventTypes: true },
  });
  const userEventTypes = data.eventTypes.map((eventType) => eventType.id);
  if (!userEventTypes.includes(safeQuery.data.id)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  } else {
    switch (method) {
      /**
       * @swagger
       * /event-types/{id}:
       *   get:
       *     operationId: getEventTypeById
       *     summary: Find a eventType
       *     parameters:
       *       - in: path
       *         name: id
       *         example: 4
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the eventType to get
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
       */
      case "GET":
        await prisma.eventType
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaEventTypeReadPublic.parse(data))
          .then((event_type) => res.status(200).json({ event_type }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /event-types/{id}:
       *   patch:
       *     operationId: editEventTypeById
       *     summary: Edit an existing eventType
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the eventType to edit
       *     security:
       *       - ApiKeyAuth: []
       *     tags:
       *     - event-types
       *     externalDocs:
       *        url: https://docs.cal.com/event-types
       *     responses:
       *       201:
       *         description: OK, eventType edited successfuly
       *       400:
       *        description: Bad request. EventType body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        const safeBody = schemaEventTypeEditBodyParams.safeParse(body);

        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
        }
        await prisma.eventType
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaEventTypeReadPublic.parse(data))
          .then((event_type) => res.status(200).json({ event_type }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /event-types/{id}:
       *   delete:
       *     operationId: removeEventTypeById
       *     summary: Remove an existing eventType
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the eventType to delete
       *     security:
       *       - ApiKeyAuth: []
       *     tags:
       *     - event-types
       *     externalDocs:
       *        url: https://docs.cal.com/event-types
       *     responses:
       *       201:
       *         description: OK, eventType removed successfuly
       *       400:
       *        description: Bad request. EventType id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
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
