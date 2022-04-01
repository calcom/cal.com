import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingResponse } from "@lib/types";
import { schemaBookingPublic } from "@lib/validations/booking";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *   summary: Get a booking by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking to get
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
export async function bookingById(req: NextApiRequest, res: NextApiResponse<BookingResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const booking = await prisma.booking.findUnique({ where: { id: safe.data.id } });
  const data = schemaBookingPublic.parse(booking);

  if (booking) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Booking was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(bookingById));
