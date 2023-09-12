import type { NextApiRequest, NextApiResponse } from "next";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import type { DestinationCalendarResponse } from "~/lib/types";
import {
  schemaDestinationCalendarEditBodyParams,
  schemaDestinationCalendarReadPublic,
} from "~/lib/validations/destination-calendar";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "~/lib/validations/shared/queryIdTransformParseInt";

export async function destionationCalendarById(
  { method, query, body, userId, prisma }: NextApiRequest,
  res: NextApiResponse<DestinationCalendarResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaDestinationCalendarEditBodyParams.safeParse(body);
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query was invalid" });
    return;
  }
  const data = await prisma.destinationCalendar.findMany({ where: { userId } });
  const userDestinationCalendars = data.map((destinationCalendar) => destinationCalendar.id);
  //  FIXME: Should we also check ownership of bokingId and eventTypeId to avoid users cross-pollinating other users calendars.
  // On a related note, moving from sequential integer IDs to UUIDs would be a good idea. and maybe help avoid having this problem.
  if (userDestinationCalendars.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      /**
       * @swagger
       * /destination-calendars/{id}:
       *   get:
       *     summary: Find a destination calendar
       *     parameters:
       *       - in: path
       *         name: id
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the destination calendar to get
       *       - in: query
       *         name: apiKey
       *         required: true
       *         schema:
       *           type: string
       *         description: Your API key
       *     tags:
       *      - destination-calendars
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
       *        description: ID of the destination calendar to edit
       *      - in: query
       *        name: apiKey
       *        required: true
       *        schema:
       *          type: string
       *        description: Your API key
       *     requestBody:
       *       description: Create a new booking related to one of your event-types
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               integration:
       *                 type: string
       *                 description: 'The integration'
       *               externalId:
       *                 type: string
       *                 description: 'The external ID of the integration'
       *               eventTypeId:
       *                 type: integer
       *                 description: 'The ID of the eventType it is associated with'
       *               bookingId:
       *                 type: integer
       *                 description: 'The booking ID it is associated with'
       *     tags:
       *      - destination-calendars
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
       *        description: ID of the destination calendar to delete
       *      - in: query
       *        name: apiKey
       *        required: true
       *        schema:
       *          type: string
       *        description: Your API key
       *     tags:
       *      - destination-calendars
       *     responses:
       *       201:
       *         description: OK, destinationCalendar removed successfuly
       *       400:
       *        description: Bad request. DestinationCalendar id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
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
      /**
       * @swagger
       * /destination-calendars/{id}:
       *   patch:
       *     summary: Edit an existing destination calendar
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the destination calendar to edit
       *      - in: query
       *        name: apiKey
       *        required: true
       *        schema:
       *          type: string
       *        description: Your API key
       *     tags:
       *      - destination-calendars
       *     responses:
       *       201:
       *         description: OK, destinationCalendar edited successfuly
       *       400:
       *        description: Bad request. DestinationCalendar body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
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
      /**
       * @swagger
       * /destination-calendars/{id}:
       *   delete:
       *     summary: Remove an existing destination calendar
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the destination calendar to delete
       *      - in: query
       *        name: apiKey
       *        required: true
       *        schema:
       *          type: string
       *        description: Your API key
       *     tags:
       *      - destination-calendars
       *     responses:
       *       201:
       *         description: OK, destinationCalendar removed successfuly
       *       400:
       *        description: Bad request. DestinationCalendar id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
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
