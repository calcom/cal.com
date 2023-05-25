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
 *               $ref: "#/components/schemas/ArrayOfBookings"
 *             examples:
 *               bookings:
 *                 value: [
 *                   {
 *                     "id": 1,
 *                     "description": "Meeting with John",
 *                     "eventTypeId": 2,
 *                     "uid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
 *                     "title": "Business Meeting",
 *                     "startTime": "2023-04-20T10:00:00.000Z",
 *                     "endTime": "2023-04-20T11:00:00.000Z",
 *                     "timeZone": "Europe/London",
 *                     "attendees": [
 *                       {
 *                         "email": "example@cal.com",
 *                         "name": "John Doe",
 *                         "timeZone": "Europe/London",
 *                         "locale": "en"
 *                       }
 *                     ]
 *                   }
 *                 ]
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
