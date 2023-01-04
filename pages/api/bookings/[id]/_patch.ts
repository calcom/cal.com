import type { NextApiRequest } from "next";
import { z } from "zod";

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
 *                 example: 15min
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
