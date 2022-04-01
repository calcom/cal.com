import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { BookingsResponse } from "@lib/types";
import { schemaBookingPublic } from "@lib/validations/booking";

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookings were found
 */
async function allBookings(_: NextApiRequest, res: NextApiResponse<BookingsResponse>) {
  const bookings = await prisma.booking.findMany();
  const data = bookings.map((booking) => schemaBookingPublic.parse(booking));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Bookings were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allBookings);
