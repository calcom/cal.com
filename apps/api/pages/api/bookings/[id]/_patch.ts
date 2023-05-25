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
 *               start:
 *                 type: string
 *                 format: date-time
 *                 description: 'Start time of the Event'
 *               end:
 *                 type: string
 *                 format: date-time
 *                 description: 'End time of the Event'
 *               status:
 *                 type: string
 *                 description: 'Acceptable values one of ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"]'
 *           examples:
 *             editBooking:
 *               value:
 *                 {
 *                   "title": "Debugging between Syed Ali Shahbaz and Hello Hello",
 *                   "start": "2023-05-24T13:00:00.000Z",
 *                   "end": "2023-05-24T13:30:00.000Z",
 *                   "status": "CANCELLED"
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
 *        description: ID of the booking to edit
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK, booking edited successfully
 *         content:
 *           application/json:
 *             examples:
 *               bookings:
 *                 value:
 *                   {
 *                     "booking": {
 *                       "id": 11223344,
 *                       "userId": 182,
 *                       "description": null,
 *                       "eventTypeId": 2323232,
 *                       "uid": "stoSJtnh83PEL4rZmqdHe2",
 *                       "title": "Debugging between Syed Ali Shahbaz and Hello Hello",
 *                       "startTime": "2023-05-24T13:00:00.000Z",
 *                       "endTime": "2023-05-24T13:30:00.000Z",
 *                       "metadata": {},
 *                       "status": "CANCELLED"
 *                     }
 *                   }
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
