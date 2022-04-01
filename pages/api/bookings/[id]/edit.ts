import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingResponse } from "@lib/types";
import { schemaBookingBodyParams, schemaBookingPublic, withValidBooking } from "@lib/validations/booking";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/bookings/{id}/edit:
 *   patch:
 *     summary: Edit an existing booking
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the booking to edit
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking edited successfuly
 *         model: Booking
 *       400:
 *        description: Bad request. Booking body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editBooking(req: NextApiRequest, res: NextApiResponse<BookingResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaBookingBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const booking = await prisma.booking.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaBookingPublic.parse(booking);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(withValidQueryIdTransformParseInt(withValidBooking(editBooking)));
