import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { BookingResponse, BookingsResponse } from "@lib/types";
import { schemaBookingReadPublic } from "@lib/validations/booking";

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Find all bookings
 *     operationId: listBookings
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
async function handler(
  { userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<BookingsResponse | BookingResponse>
) {
  const args: Prisma.BookingFindManyArgs = isAdmin ? {} : { where: { userId } };
  const data = await prisma.booking.findMany(args);
  const bookings = data.map((booking) => schemaBookingReadPublic.parse(booking));
  if (!bookings) throw new HttpError({ statusCode: 401, message: "No Bookings were found" });
  res.status(200).json({ bookings });
}

export default defaultResponder(handler);
