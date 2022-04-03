import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingReferenceResponse } from "@lib/types";
import {
  schemaBookingReferenceBodyParams,
  schemaBookingReferencePublic,
  withValidBookingReference,
} from "@lib/validations/booking-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/booking-references/{id}/edit:
 *   patch:
 *     summary: Edit an existing bookingReference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the bookingReference to edit
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference edited successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editBookingReference(
  req: NextApiRequest,
  res: NextApiResponse<BookingReferenceResponse>
) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaBookingReferenceBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const bookingReference = await prisma.bookingReference.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaBookingReferencePublic.parse(bookingReference);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidBookingReference(editBookingReference))
);
