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
 *       - bookings
 *     responses:
 *       200:
 *         description: OK, booking cancelled successfuly
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
 *               <td>Cannot cancel past events</td>
 *               <td>The provided id matched an existing booking with a past startDate.</td>
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
