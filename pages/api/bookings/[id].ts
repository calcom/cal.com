import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingResponse } from "@lib/types";
import { schemaBookingBodyParams, schemaBookingPublic } from "@lib/validations/booking";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/bookings/{id}:
 *   get:
 *     summary: Get a booking by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the booking to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 *   patch:
 *     summary: Edit an existing booking
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: booking
 *        description: The booking to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Booking'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking edited successfuly
 *         model: Booking
 *       400:
 *        description: Bad request. Booking body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing booking
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking removed successfuly
 *         model: Booking
 *       400:
 *        description: Bad request. Booking id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function bookingById(req: NextApiRequest, res: NextApiResponse<BookingResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaBookingBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("User not found");
  const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
  if (userBookingIds.includes(safeQuery.data.id)) {
    switch (method) {
      case "GET":
        await prisma.booking
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaBookingPublic.parse(data))
          .then((booking) => res.status(200).json({ booking }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Booking with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.booking
          .update({
            where: { id: safeQuery.data.id },
            data: safeBody.data,
          })
          .then((data) => schemaBookingPublic.parse(data))
          .then((booking) => res.status(200).json({ booking }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Booking with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

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
  } else res.status(401).json({ message: "Unauthorized" });
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(bookingById));
