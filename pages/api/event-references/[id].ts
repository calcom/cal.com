import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DailyEventReferenceResponse } from "@lib/types";
import {
  schemaDailyEventReferenceEditBodyParams,
  schemaDailyEventReferenceReadPublic,
} from "@lib/validations/daily-event-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function dailyEventReferenceById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<DailyEventReferenceResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaDailyEventReferenceEditBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userBookings = await prisma.booking.findMany({ where: { userId } });
  const userBookingIds: number[] = userBookings.map((booking) => booking.id);
  const userBookingDailyEventReferences = await prisma.dailyEventReference.findMany({
    where: { bookingId: { in: userBookingIds } },
  });
  const userBookingDailyEventReferenceIds = userBookingDailyEventReferences.map(
    (dailyEventReference) => dailyEventReference.id
  );
  if (!userBookingDailyEventReferenceIds.includes(safeQuery.data.id))
    res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      /**
       * @swagger
       * /event-references/{id}:
       *   get:
       *     summary: Find a event reference
       *     parameters:
       *       - in: path
       *         name: id
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the event reference to get
       *     tags:
       *     - event-references
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *        description: Authorization information is missing or invalid.
       *       404:
       *         description: EventReference was not found
       */
      case "GET":
        await prisma.dailyEventReference
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaDailyEventReferenceReadPublic.parse(data))
          .then((daily_event_reference) => res.status(200).json({ daily_event_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      /**
       * @swagger
       * /event-references/{id}:
       *   patch:
       *     summary: Edit an existing event reference
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the event reference to edit
       *     tags:
       *     - event-references
       *     responses:
       *       201:
       *         description: OK, EventReference edited successfuly
       *       400:
       *        description: Bad request. EventReference body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.dailyEventReference
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaDailyEventReferenceReadPublic.parse(data))
          .then((daily_event_reference) => res.status(200).json({ daily_event_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      /**
       * @swagger
       * /event-references/{id}:
       *   delete:
       *     summary: Remove an existing event reference
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the event reference to delete
       *     tags:
       *     - event-references
       *     responses:
       *       201:
       *         description: OK, EventReference removed successfuly
       *       400:
       *        description: Bad request. EventReference id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        await prisma.dailyEventReference
          .delete({
            where: { id: safeQuery.data.id },
          })
          .then(() =>
            res.status(200).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} deleted`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} not found`,
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

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  withValidQueryIdTransformParseInt(dailyEventReferenceById)
);
