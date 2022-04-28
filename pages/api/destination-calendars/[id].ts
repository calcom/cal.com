import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DestinationCalendarResponse } from "@lib/types";
import {
  schemaDestinationCalendarEditBodyParams,
  schemaDestinationCalendarReadPublic,
} from "@lib/validations/destination-calendar";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /destination-calendars/{id}:
 *   get:
 *     summary: Find a destination calendar by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the destination calendar to get

 *     tags:
 *     - destination-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: DestinationCalendar was not found
 *   patch:
 *     summary: Edit an existing destination calendar

 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the destination calendar to edit

 *     tags:
 *     - destination-calendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar edited successfuly
 *       400:
 *        description: Bad request. DestinationCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing destination calendar
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the destination calendar to delete

 *     tags:
 *     - destination-calendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar removed successfuly
 *       400:
 *        description: Bad request. DestinationCalendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function destionationCalendarById(
  req: NextApiRequest,
  res: NextApiResponse<DestinationCalendarResponse>
) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaDestinationCalendarEditBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const data = await prisma.destinationCalendar.findMany({ where: { userId } });
  const userDestinationCalendars = data.map((destinationCalendar) => destinationCalendar.id);
  //  FIXME: Should we also check ownership of bokingId and eventTypeId to avoid users cross-pollinating other users calendars.
  // On a related note, moving from sequential integer IDs to UUIDs would be a good idea. and maybe help avoid having this problem.
  if (userDestinationCalendars.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.destinationCalendar
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaDestinationCalendarReadPublic.parse(data))
          .then((destination_calendar) => res.status(200).json({ destination_calendar }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DestinationCalendar with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.destinationCalendar
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaDestinationCalendarReadPublic.parse(data))
          .then((destination_calendar) => res.status(200).json({ destination_calendar }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `DestinationCalendar with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        await prisma.destinationCalendar
          .delete({
            where: { id: safeQuery.data.id },
          })
          .then(() =>
            res.status(200).json({
              message: `DestinationCalendar with id: ${safeQuery.data.id} deleted`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `DestinationCalendar with id: ${safeQuery.data.id} not found`,
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
  withValidQueryIdTransformParseInt(destionationCalendarById)
);
