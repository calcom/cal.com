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

/**
 * @swagger
 * /booking-references/{id}:
 *   get:
 *     summary: Find a booking reference by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the booking reference to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: BookingReference was not found
 *   patch:
 *     summary: Edit an existing booking reference
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: bookingReference
 *        description: The bookingReference to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/BookingReference'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking reference to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference edited successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing booking reference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking reference to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference removed successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function bookingReferenceById(
  req: NextApiRequest,
  res: NextApiResponse<BookingReferenceResponse>
) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("User not found");
  const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
  const bookingReference = await prisma.bookingReference.findUnique({ where: { id: safeQuery.data.id } });
  if (!bookingReference) throw new Error("BookingReference not found");
  if (userBookingIds.includes(bookingReference.bookingId)) {
    switch (method) {
      case "GET":
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
