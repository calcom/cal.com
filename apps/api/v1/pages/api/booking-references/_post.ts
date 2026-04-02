import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import {
  schemaBookingCreateBodyParams,
  schemaBookingReferenceReadPublic,
} from "~/lib/validations/booking-reference";

/**
 * @swagger
 * /booking-references:
 *   post:
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
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
 *             properties:
 *               type:
 *                 type: string
 *               uid:
 *                 type: string
 *               meetingId:
 *                 type: string
 *               meetingPassword:
 *                 type: string
 *               meetingUrl:
 *                 type: string
 *               bookingId:
 *                 type: boolean
 *               externalCalendarId:
 *                 type: string
 *               deleted:
 *                 type: boolean
 *               credentialId:
 *                 type: integer
 *     tags:
 *      - booking-references
 *     responses:
 *       201:
 *         description: OK,  booking reference created
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const body = schemaBookingCreateBodyParams.parse(req.body);
  const args: Prisma.BookingFindFirstOrThrowArgs = isSystemWideAdmin
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
