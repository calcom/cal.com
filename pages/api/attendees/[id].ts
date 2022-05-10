import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AttendeeResponse } from "@lib/types";
import { schemaAttendeeEditBodyParams, schemaAttendeeReadPublic } from "@lib/validations/attendee";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function attendeeById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<AttendeeResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ error: safeQuery.error });
    return;
  }
  const userBookingsAttendeeIds = await prisma.booking
    // Find all user bookings, including attendees
    .findMany({
      where: { userId },
      include: { attendees: true },
    })
    .then(
      // Flatten and merge all the attendees in one array
      (bookings) =>
        bookings
          .map((bookings) => bookings.attendees)
          .flat()
          .map((attendee) => attendee.id)
    );
  // @note: Here we make sure to only return attendee's of the user's own bookings.
  if (!userBookingsAttendeeIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      /**
       * @swagger
       * /attendees/{id}:
       *   get:
       *     operationId: getAttendeeById
       *     summary: Find an attendee
       *     parameters:
       *       - in: path
       *         name: id
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the attendee to get
       *         example: 3
       *     tags:
       *     - attendees
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *        description: Authorization information is missing or invalid.
       *       404:
       *         description: Attendee was not found
       */
      case "GET":
        await prisma.attendee
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaAttendeeReadPublic.parse(data))
          .then((attendee) => res.status(200).json({ attendee }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /attendees/{id}:
       *   patch:
       *     summary: Edit an existing attendee
       *     operationId: editAttendeeById
       *     requestBody:
       *       description: Edit an existing attendee related to one of your bookings
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               email:
       *                 type: string
       *                 example: email@example.com
       *               name:
       *                 type: string
       *                 example: John Doe
       *               timeZone:
       *                 type: string
       *                 example: Europe/London
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *          example: 3
       *        required: true
       *        description: ID of the attendee to edit
       *     tags:
       *     - attendees
       *     responses:
       *       201:
       *         description: OK, attendee edited successfuly
       *       400:
       *        description: Bad request. Attendee body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        const safeBody = schemaAttendeeEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          res.status(400).json({ message: "Bad request", error: safeBody.error });
          return;
        }
        await prisma.attendee
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaAttendeeReadPublic.parse(data))
          .then((attendee) => res.status(200).json({ attendee }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /attendees/{id}:
       *   delete:
       *     operationId: removeAttendeeById
       *     summary: Remove an existing attendee
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the attendee to delete
       *     tags:
       *     - attendees
       *     responses:
       *       201:
       *         description: OK, attendee removed successfuly
       *       400:
       *        description: Bad request. Attendee id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        await prisma.attendee
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Attendee with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Attendee with id: ${safeQuery.data.id} not found`,
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

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(attendeeById));
