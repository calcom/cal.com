import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { BookingReferencesResponse } from "@lib/types";
import { schemaBookingReferencePublic } from "@lib/validations/booking-reference";

/**
 * @swagger
 * /api/booking-references:
 *   get:
 *     summary: Get all bookingReferences
 *     tags:
 *     - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookingReferences were found
 */
async function allBookingReferences(_: NextApiRequest, res: NextApiResponse<BookingReferencesResponse>) {
  const bookingReferences = await prisma.bookingReference.findMany();
  const data = bookingReferences.map((bookingReference) =>
    schemaBookingReferencePublic.parse(bookingReference)
  );

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No BookingReferences were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allBookingReferences);
