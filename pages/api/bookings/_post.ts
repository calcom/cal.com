import type { NextApiRequest } from "next";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Creates a new booking
 *     operationId: addBooking
 *     requestBody:
 *       description: Edit an existing booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: 15min
 *               startTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *               endTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *              recurringCount:
 *                 type: number
 *                 example: 8
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: Booking(s) created successfully.
 *       400:
 *        description: |
 *          Message | Cause
 *          :--|:--
 *          Booking body is invalid| Missing property on booking entity.
 *          Invalid eventTypeId| The provided eventTypeId does not exist.
 *          Missing recurringCount| The eventType is recurring, and no recurringCount was passed.
 *          Invalid recurringCount| The provided recurringCount is greater than the eventType recurring config
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function handler(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  if (isAdmin) req.userId = req.body.userId || userId;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(handler);
