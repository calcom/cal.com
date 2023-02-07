import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingReadPublic } from "~/lib/validations/booking";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

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
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Booking"
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { attendees: true, user: true },
  });
  return { booking: schemaBookingReadPublic.parse(booking) };
}

export default defaultResponder(getHandler);
