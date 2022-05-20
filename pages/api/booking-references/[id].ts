import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingReferenceResponse } from "@lib/types";
import {
  schemaBookingEditBodyParams,
  schemaBookingReferenceReadPublic,
} from "@lib/validations/booking-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

export async function bookingReferenceById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<BookingReferenceResponse>
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
  const bookingReferences = await prisma.bookingReference
    .findMany({ where: { id: { in: userBookingIds } } })
    .then((bookingReferences) => bookingReferences.map((bookingReference) => bookingReference.id));

  if (!bookingReferences?.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        /**
         * @swagger
         * /booking-references/{id}:
         *   get:
         *     operationId: getBookingReferenceById
         *     summary: Find a booking reference
         *     parameters:
         *       - in: path
         *         name: id
         *         schema:
         *           type: integer
         *         required: true
         *         description: ID of the booking reference to get
         *     tags:
         *     - booking-references
         *     responses:
         *       200:
         *         description: OK
         *       401:
         *        description: Authorization information is missing or invalid.
         *       404:
         *         description: BookingReference was not found
         */
        await prisma.bookingReference
          .findFirst({ where: { id: safeQuery.data.id } })
          .then((data) => schemaBookingReferenceReadPublic.parse(data))
          .then((booking_reference) => res.status(200).json({ booking_reference }))
          .catch((error: Error) => {
            console.log(error);
            res.status(404).json({
              message: `BookingReference with id: ${safeQuery.data.id} not found`,
              error,
            });
          });

        break;
      case "PATCH":
        /**
         * @swagger
         * /booking-references/{id}:
         *   patch:
         *     operationId: editBookingReferenceById
         *     summary: Edit an existing booking reference
         *     requestBody:
         *       description: Edit an existing booking reference related to one of your bookings
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             properties:
         *               days:
         *                 type: array
         *                 example: email@example.com
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
         *        description: ID of the booking reference to edit
         *     tags:
         *     - booking-references
         *     responses:
         *       201:
         *         description: OK, safeBody.data edited successfuly
         *       400:
         *        description: Bad request. BookingReference body is invalid.
         *       401:
         *        description: Authorization information is missing or invalid.
         */

        const safeBody = schemaBookingEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          console.log(safeBody.error);
          res.status(400).json({ message: "Invalid request body", error: safeBody.error });
          return;
        }
        await prisma.bookingReference
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaBookingReferenceReadPublic.parse(data))
          .then((booking_reference) => res.status(200).json({ booking_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `BookingReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      case "DELETE":
        /**
         * @swagger
         * /booking-references/{id}:
         *   delete:
         *     operationId: removeBookingReferenceById
         *     summary: Remove an existing booking reference
         *     parameters:
         *      - in: path
         *        name: id
         *        schema:
         *          type: integer
         *        required: true
         *        description: ID of the booking reference to delete
         *     tags:
         *     - booking-references
         *     responses:
         *       201:
         *         description: OK, bookingReference removed successfuly
         *       400:
         *        description: Bad request. BookingReference id is invalid.
         *       401:
         *        description: Authorization information is missing or invalid.
         */
        await prisma.bookingReference
          .delete({
            where: { id: safeQuery.data.id },
          })
          .then(() =>
            res.status(200).json({
              message: `BookingReference with id: ${safeQuery.data.id} deleted`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `BookingReference with id: ${safeQuery.data.id} not found`,
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
  withValidQueryIdTransformParseInt(bookingReferenceById)
);
