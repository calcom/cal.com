import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingResponse } from "@lib/types";
import { schemaBookingBodyParams, schemaBookingPublic, withValidBooking } from "@lib/validations/booking";

/**
 * @swagger
 * /api/bookings/new:
 *   post:
 *     summary: Creates a new booking
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/Booking'
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking created
 *         model: Booking
 *       400:
 *        description: Bad request. Booking body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createBooking(req: NextApiRequest, res: NextApiResponse<BookingResponse>) {
  const safe = schemaBookingBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const booking = await prisma.booking.create({ data: safe.data });
  const data = schemaBookingPublic.parse(booking);

  if (data) res.status(201).json({ data, message: "Booking created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new booking",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidBooking(createBooking));
