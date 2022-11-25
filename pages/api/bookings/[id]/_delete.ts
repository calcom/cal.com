import type { NextApiRequest } from "next";

import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { defaultResponder } from "@calcom/lib/server";
import { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   delete:
 *     summary: Booking cancellation
 *     operationId: cancelBookingById
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allRemainingBookings:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking to cancel
 *     tags:
 *       - bookings
 *     responses:
 *       200:
 *         description: OK, booking cancelled successfuly
 *       400:
 *        description: |
 *          Message | Cause
 *          :--|:--
 *          Booking not found| The provided id didn't correspond to any existing booking.
 *          Cannot cancel past events| The provided id matched an existing booking with a past startDate.
 *          User not found| The userId did not matched an existing user.
 *       404:
 *        description: User not found
 */
async function handler(req: NextApiRequest) {
  const { id } = schemaQueryIdParseInt.parse(req.query);
  const { allRemainingBookings, cancellationReason } = schemaBookingCancelParams.parse({
    ...req.body,
    cancellationReason: req.body.reason,
  });
  // Normalizing for universal handler
  req.body = { id, allRemainingBookings, cancellationReason };
  return await handleCancelBooking(req);
}

export default defaultResponder(handler);
