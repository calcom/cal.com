import type { NextApiRequest } from "next";

import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { bookingCancelSchema } from "~/lib/validations/booking";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   delete:
 *     summary: Booking cancellation
 *     operationId: cancelBookingById
 *
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking to cancel
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *      - in: query
 *        name: allRemainingBookings
 *        required: false
 *        schema:
 *          type: boolean
 *        description: Delete all remaining bookings
 *      - in: query
 *        name: cancellationReason
 *        required: false
 *        schema:
 *          type: string
 *        description: The reason for cancellation of the booking
 *      - in: query
 *        name: cancelledBy
 *        required: false
 *        schema:
 *          type: string
 *        description: The email of who cancelled the booking
 *     tags:
 *       - bookings
 *     responses:
 *       200:
 *         description: OK, booking cancelled successfully
 *       400:
 *        description: |
 *          Bad request
 *           <table>
 *             <tr>
 *               <td>Message</td>
 *               <td>Cause</td>
 *             </tr>
 *             <tr>
 *               <td>Booking not found</td>
 *               <td>The provided id didn't correspond to any existing booking.</td>
 *             </tr>
 *             <tr>
 *               <td>User not found</td>
 *               <td>The userId did not matched an existing user.</td>
 *             </tr>
 *           </table>
 *       404:
 *        description: User not found
 */
async function handler(req: NextApiRequest) {
  const { id, allRemainingBookings, cancellationReason, cancelledBy } = schemaQueryIdParseInt
    .merge(
      bookingCancelSchema.pick({ allRemainingBookings: true, cancellationReason: true, cancelledBy: true })
    )
    .parse({
      ...req.query,
      allRemainingBookings: req.query.allRemainingBookings === "true",
    });

  return await handleCancelBooking({
    bookingData: { id, allRemainingBookings, cancellationReason, cancelledBy },
    userId: req.userId,
  });
}

export default defaultResponder(handler);
