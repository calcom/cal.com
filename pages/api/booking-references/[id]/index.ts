import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingReferenceResponse } from "@lib/types";
import { schemaBookingReferencePublic } from "@lib/validations/booking-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/booking-references/{id}:
 *   get:
 *   summary: Get a bookingReference by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the bookingReference to get
 *     tags:
 *     - bookingReferences
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: BookingReference was not found
 */
export async function bookingReferenceById(
  req: NextApiRequest,
  res: NextApiResponse<BookingReferenceResponse>
) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const bookingReference = await prisma.bookingReference.findUnique({ where: { id: safe.data.id } });
  const data = schemaBookingReferencePublic.parse(bookingReference);

  if (bookingReference) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "BookingReference was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(bookingReferenceById));
