import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { BookingResponse, BookingsResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaBookingBodyParams, schemaBookingPublic, withValidBooking } from "@lib/validations/booking";

/**
 * @swagger
 * /v1/bookings:
 *   get:
 *     summary: Get all bookings
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
 *         description: No bookings were found
 *   post:
 *     summary: Creates a new booking
 *     security:
 *       - ApiKeyAuth: []
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
async function createOrlistAllBookings(
  req: NextApiRequest,
  res: NextApiResponse<BookingsResponse | BookingResponse>
) {
  const { method } = req;
  const userId = getCalcomUserId(res);

  if (method === "GET") {
    const data = await prisma.booking.findMany({ where: { userId } });
    const bookings = data.map((booking) => schemaBookingPublic.parse(booking));
    if (bookings) res.status(200).json({ bookings });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Bookings were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaBookingBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.booking.create({ data: { ...safe.data, userId } });
    const booking = schemaBookingPublic.parse(data);

    if (booking) res.status(201).json({ booking, message: "Booking created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new booking",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllBookings);
