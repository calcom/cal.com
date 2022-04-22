import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DailyEventReferenceResponse } from "@lib/types";
import {
  schemaDailyEventReferenceBodyParams,
  schemaDailyEventReferencePublic,
} from "@lib/validations/daily-event-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/daily-event-references/{id}:
 *   get:
 *     summary: Get a daily event reference by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the daily event reference to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - daily-event-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: DailyEventReference was not found
 *   patch:
 *     summary: Edit an existing daily event reference
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: dailyEventReference
 *        description: The dailyEventReference to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/DailyEventReference'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the daily event reference to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - daily-event-references
 *     responses:
 *       201:
 *         description: OK, dailyEventReference edited successfuly
 *         model: DailyEventReference
 *       400:
 *        description: Bad request. DailyEventReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing daily event reference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the daily event reference to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - daily-event-references
 *     responses:
 *       201:
 *         description: OK, dailyEventReference removed successfuly
 *         model: DailyEventReference
 *       400:
 *        description: Bad request. DailyEventReference id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function dailyEventReferenceById(
  req: NextApiRequest,
  res: NextApiResponse<DailyEventReferenceResponse>
) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaDailyEventReferenceBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const userBookings = await prisma.booking.findMany({ where: { userId } });
  const userBookingIds = userBookings.map((booking) => booking.id);
  const userBookingDailyEventReferences = await prisma.dailyEventReference.findMany({
    where: { bookingId: { in: userBookingIds } },
  });
  const userBookingDailyEventReferenceIds = userBookingDailyEventReferences.map(
    (dailyEventReference) => dailyEventReference.id
  );
  if (userBookingDailyEventReferenceIds.includes(safeQuery.data.id)) {
    switch (method) {
      case "GET":
        await prisma.dailyEventReference
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaDailyEventReferencePublic.parse(data))
          .then((daily_event_reference) => res.status(200).json({ daily_event_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.dailyEventReference
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaDailyEventReferencePublic.parse(data))
          .then((daily_event_reference) => res.status(200).json({ daily_event_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DailyEventReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

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
  } else res.status(401).json({ message: "Unauthorized" });
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  withValidQueryIdTransformParseInt(dailyEventReferenceById)
);
