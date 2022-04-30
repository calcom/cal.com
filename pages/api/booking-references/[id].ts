import { BookingModel } from "@/../../packages/prisma/zod";
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
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("User not found");
  const userBookingIds = userWithBookings.bookings.map((booking: { id: number }) => booking.id).flat();
  const bookingReference = await prisma.bookingReference.findUnique({ where: { id: safeQuery.data.id } });
  if (!bookingReference?.bookingId) throw new Error("BookingReference: bookingId not found");
  if (userBookingIds.includes(bookingReference.bookingId)) {
    switch (method) {
      case "GET":
        /**
         * @swagger
         * /booking-references/{id}:
         *   get:
         *     summary: Find a booking reference
         *     parameters:
         *       - in: path
         *         name: id
         *         schema:
         *           type: integer
         *         required: true
         *         description: Numeric ID of the booking reference to get
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
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaBookingReferenceReadPublic.parse(data))
          .then((booking_reference) => res.status(200).json({ booking_reference }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `BookingReference with id: ${safeQuery.data.id} not found`,
              error,
            })
          );

        break;
      case "PATCH":
        /**
         * @swagger
         * /booking-references/{id}:
         *   patch:
         *     summary: Edit an existing booking reference
         *     parameters:
         *      - in: path
         *        name: id
         *        schema:
         *          type: integer
         *        required: true
         *        description: Numeric ID of the booking reference to edit
         *     tags:
         *     - booking-references
         *     responses:
         *       201:
         *         description: OK, bookingReference edited successfuly
         *       400:
         *        description: Bad request. BookingReference body is invalid.
         *       401:
         *        description: Authorization information is missing or invalid.
         */

        const safeBody = schemaBookingEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          throw new Error("Invalid request body");
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
      /**
       * @swagger
       * /booking-references/{id}:
       *   delete:
       *     summary: Remove an existing booking reference
       *     parameters:
       *      - in: path
       *        name: id
       *        schema:
       *          type: integer
       *        required: true
       *        description: Numeric ID of the booking reference to delete
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
      case "DELETE":
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
  } else res.status(401).json({ message: "Unauthorized" });
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  withValidQueryIdTransformParseInt(bookingReferenceById)
);
