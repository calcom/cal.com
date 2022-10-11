import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import {
  schemaBookingEditBodyParams,
  schemaBookingReferenceReadPublic,
} from "@lib/validations/booking-reference";
import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /booking-references/{id}:
 *   patch:
 *     operationId: editBookingReferenceById
 *     summary: Edit an existing booking reference
 *     requestBody:
 *       description: Edit an existing booking reference related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: array
 *                 example: email@example.com
 *               startTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *               endTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking reference to edit
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, safeBody.data edited successfully
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body, isAdmin, userId } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaBookingEditBodyParams.parse(body);
  /* If user tries to update bookingId, we run extra checks */
  if (data.bookingId) {
    const args: Prisma.BookingFindFirstOrThrowArgs = isAdmin
      ? /* If admin, we only check that the booking exists */
        { where: { id: data.bookingId } }
      : /* For non-admins we make sure the booking belongs to the user */
        { where: { id: data.bookingId, userId } };
    await prisma.booking.findFirstOrThrow(args);
  }
  const booking_reference = await prisma.bookingReference.update({ where: { id }, data });
  return { booking_reference: schemaBookingReferenceReadPublic.parse(booking_reference) };
}

export default defaultResponder(patchHandler);
