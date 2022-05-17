import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeCustomInputResponse } from "@lib/types";
import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
} from "@lib/validations/event-type-custom-input";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /custom-inputs/{id}:
 *   get:
 *     summary: Find a eventTypeCustomInput
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the eventTypeCustomInput to get
 *     tags:
 *     - custom-inputs
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: EventType was not found
 *   patch:
 *     summary: Edit an existing eventTypeCustomInput
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventTypeCustomInput to edit
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput edited successfuly
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing eventTypeCustomInput
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventTypeCustomInput to delete
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput removed successfuly
 *       400:
 *        description: Bad request. EventType id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function eventTypeById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaEventTypeCustomInputBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const data = await prisma.eventType.findMany({ where: { userId } });
  const userEventTypes = data.map((eventType) => eventType.id);
  const userEventTypeCustomInputs = await prisma.eventTypeCustomInput.findMany({
    where: { eventType: userEventTypes },
  });
  const userEventTypeCustomInputIds = userEventTypeCustomInputs.map(
    (eventTypeCustomInput) => eventTypeCustomInput.id
  );
  if (!userEventTypeCustomInputIds.includes(safeQuery.data.id))
    res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.eventTypeCustomInput
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaEventTypeCustomInputPublic.parse(data))
          .then((event_type_custom_input) => res.status(200).json({ event_type_custom_input }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
        }
        await prisma.eventTypeCustomInput
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaEventTypeCustomInputPublic.parse(data))
          .then((event_type_custom_input) => res.status(200).json({ event_type_custom_input }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `EventType with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.eventTypeCustomInput
          .delete({
            where: { id: safeQuery.data.id },
          })
          .then(() =>
            res.status(200).json({
              message: `CustomInputEventType with id: ${safeQuery.data.id} deleted`,
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
