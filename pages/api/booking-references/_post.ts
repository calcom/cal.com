import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaBookingCreateBodyParams,
  schemaBookingReferenceReadPublic,
} from "@lib/validations/booking-reference";

/**
 * @swagger
 * /booking-references:
 *   post:
 *     operationId: addBookingReference
 *     summary: Creates a new  booking reference
 *     requestBody:
 *       description: Create a new booking reference related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - type
 *              - uid
 *              - meetingId
 *              - bookingId
 *              - deleted
 *             properties:
 *               deleted:
 *                 type: boolean
 *                 example: false
 *               uid:
 *                 type: string
 *                 example: '123456789'
 *               type:
 *                 type: string
 *                 example: email@example.com
 *               bookingId:
 *                 type: number
 *                 example: 1
 *               meetingId:
 *                 type: string
 *                 example: 'meeting-id'
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK,  booking reference created
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const body = schemaBookingCreateBodyParams.parse(req.body);
  const args: Prisma.BookingFindFirstOrThrowArgs = isAdmin
    ? /* If admin, we only check that the booking exists */
      { where: { id: body.bookingId } }
    : /* For non-admins we make sure the booking belongs to the user */
      { where: { id: body.bookingId, userId } };
  await prisma.booking.findFirstOrThrow(args);

  const data = await prisma.bookingReference.create({
    data: {
      ...body,
      bookingId: body.bookingId,
    },
  });

  return {
    booking_reference: schemaBookingReferenceReadPublic.parse(data),
    message: "Booking reference created successfully",
  };
}

export default defaultResponder(postHandler);
