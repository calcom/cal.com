import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingResponse } from "@lib/types";
import { schemaBookingEditBodyParams, schemaBookingReadPublic } from "@lib/validations/booking";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function bookingById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<BookingResponse>
) {
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query was invalid" });
    return;
  }
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("User not found");
  const userBookingIds = userWithBookings.bookings.map((booking: { id: number }) => booking.id).flat();
  if (!userBookingIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      /**
       * @swagger
       * /bookings/{id}:
       *   get:
       *     summary: Find a booking
       *     operationId: getBookingById
       *     parameters:
       *       - in: path
       *         name: id
       *         schema:
       *           type: integer
       *         required: true
       *         description: ID of the booking to get
       *     tags:
       *     - bookings
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *        description: Authorization information is missing or invalid.
       *       404:
       *         description: Booking was not found
       */
      case "GET":
        await prisma.booking
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaBookingReadPublic.parse(data))
          .then((booking) => res.status(200).json({ booking }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Booking with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /bookings/{id}:
       *   patch:
       *     summary: Edit an existing booking
       *     operationId: editBookingById
       *     requestBody:
       *       description: Edit an existing booking related to one of your event-types
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               title:
       *                 type: string
       *                 example: 15min
       *               startTime:
       *                 type: string
       *                 example: 1970-01-01T17:00:00.000Z
       *               endTime:
       *                 type: string
       *                 example: 1970-01-01T17:00:00.000Z
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the booking to edit
       *     tags:
       *     - bookings
       *     responses:
       *       201:
       *         description: OK, booking edited successfuly
       *       400:
       *        description: Bad request. Booking body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        const safeBody = schemaBookingEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          console.log(safeBody.error);
          res.status(400).json({ message: "Bad request", error: safeBody.error });
          return;
        }
        await prisma.booking
          .update({
            where: { id: safeQuery.data.id },
            data: safeBody.data,
          })
          // .then((data) => schemaBookingReadPublic.parse(data))
          .then((booking) => res.status(200).json({ booking }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Booking with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /bookings/{id}:
       *   delete:
       *     summary: Remove an existing booking
       *     operationId: removeBookingById
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: ID of the booking to delete
       *     tags:
       *     - bookings
       *     responses:
       *       201:
       *         description: OK, booking removed successfuly
       *       400:
       *        description: Bad request. Booking id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        await prisma.booking
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Booking with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Booking with id: ${safeQuery.data.id} not found`,
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

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(bookingById));
