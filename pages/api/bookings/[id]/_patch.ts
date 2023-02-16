import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingEditBodyParams, schemaBookingReadPublic } from "~/lib/validations/booking";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}:
 *   patch:
 *     summary: Edit an existing booking
 *     operationId: editBookingById
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
 *                 description: 'Booking event title'
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: 'Start time of the Event'
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: 'End time of the Event'
 *               recurringEventId:
 *                 type: integer
 *                 description: 'Recurring event ID if the event is recurring'
 *               description:
 *                 type: string
 *                 description: 'Event description'
 *               status:
 *                 type: string
 *                 description: 'Acceptable values one of ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"]'
 *               location:
 *                 type: string
 *                 description: 'Meeting location'
 *               smsReminderNumber:
 *                 type: number
 *                 description: 'SMS reminder number'
 *               attendees:
 *                 type: array
 *                 description: 'List of attendees of the booking'
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     timeZone:
 *                       type: string
 *                     locale:
 *                       type: string
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
 *        description: ID of the booking to edit
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking edited successfully
 *       400:
 *        description: Bad request. Booking body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaBookingEditBodyParams.parse(body);
  await checkPermissions(req, data);
  const booking = await prisma.booking.update({ where: { id }, data });
  return { booking: schemaBookingReadPublic.parse(booking) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaBookingEditBodyParams>) {
  const { isAdmin } = req;
  if (body.userId && !isAdmin) {
    // Organizer has to be a cal user and we can't allow a booking to be transfered to some other cal user's name
    throw new HttpError({
      statusCode: 403,
      message: "Only admin can change the organizer of a booking",
    });
  }
}

export default defaultResponder(patchHandler);
