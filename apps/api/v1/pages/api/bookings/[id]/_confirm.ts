import type { NextApiRequest } from "next";

import { updateConfirmationStatus } from "@calcom/features/bookings/lib/updateConfirmationStatus";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemeBookingConfirmBodyParams } from "~/lib/validations/booking";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/confirm:
 *   post:
 *     summary: Confirm a booking
 *     operationId: confirmBookingById
 *     requestBody:
 *       description: Accept or Reject an unconfirmed booking
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: 'Reason for booking rejection'
 *               recurringEventId:
 *                 type: integer
 *                 description: 'Required for confiriming entire series for recurring events'
 *               confirmed:
 *                 type: boolean
 *                 required: true
 *                 description: 'Accept or Reject booking'
 *           examples:
 *             editBooking:
 *               value:
 *                 {
 *                   "rejectionReason": "Slot filled",
 *                   "confirmed": true
 *                 }
 *
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking to update confirmation
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK, booking confirmation updated
 *         content:
 *           application/json:
 *             examples:
 *               bookings:
 *                 value:
 *                   {
 *                      "message": "Booking confirmed",
 *                      "statue" : "ACCEPTED"
 *                   }
 *       400:
 *        description: Bad request. Booking body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  timeZone: true,
  locale: true,
  timeFormat: true,
  destinationCalendar: true,
};

export async function handler(req: NextApiRequest) {
  const { query, body, userId } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const parsedBody = schemeBookingConfirmBodyParams.parse(body);
  /** 
   * attach user directly from booking to support for systemWideAdmin scope
    the request has passed required checks for booking access in authMiddleware ,
    its safe to attach user directly from booking 
  **/
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!booking) {
    throw new HttpError({ statusCode: 404, message: "Booking not found" });
  }
  const bookingUserId = booking.userId;

  const user = await prisma.user.findUnique({
    where: { id: bookingUserId ?? userId },
    select: userSelect,
  });
  if (!user) {
    throw new HttpError({ statusCode: 404, message: "User not found" });
  }

  return await updateConfirmationStatus({
    user,
    data: {
      bookingId: id,
      ...parsedBody,
      recurringEventId: parsedBody.recurringEventId ?? undefined,
    },
  });
}

export default defaultResponder(handler);
