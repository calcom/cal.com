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
  const { id, allRemainingBookings, cancellationReason } = schemaQueryIdParseInt
    .merge(schemaBookingCancelParams.pick({ allRemainingBookings: true, cancellationReason: true }))
    .parse({
      ...req.query,
      allRemainingBookings: req.query.allRemainingBookings === "true",
    });
  await checkPermissions(req, data);
  // Normalizing for universal handler
  req.body = { id, allRemainingBookings, cancellationReason };
  return await handleCancelBooking(req);
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaBookingEditBodyParams>) {
  const { isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;
  if (body.userId && !isSystemWideAdmin && !isOrganizationOwnerOrAdmin) {
    // Organizer has to be a cal user and we can't allow a booking to be transfered to some other cal user's name
    throw new HttpError({
      statusCode: 403,
      message: "Only admin can cancel a booking for the organizer",
    });
  }
  if (isOrganizationOwnerOrAdmin) {
    const accessibleUsersIds = await getAccessibleUsers({
      adminUserId: userId,
      memberUserIds: requestedUserIds,
    });
    if (accessibleUsersIds.length === 0) {
      throw new HttpError({
        statusCode: 403,
        message: "Only admin can cancel a booking for the organizer",
      });
    }
  }
}

export default defaultResponder(handler);
