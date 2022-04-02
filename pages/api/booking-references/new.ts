import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingReferenceResponse } from "@lib/types";
import {
  schemaBookingReferenceBodyParams,
  schemaBookingReferencePublic,
  withValidBookingReference,
} from "@lib/validations/booking-reference";

/**
 * @swagger
 * /api/booking-references/new:
 *   post:
 *     summary: Creates a new bookingReference
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/BookingReference'
 *     tags:
 *     - bookingReferences
 *     responses:
 *       201:
 *         description: OK, bookingReference created
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createBookingReference(req: NextApiRequest, res: NextApiResponse<BookingReferenceResponse>) {
  const safe = schemaBookingReferenceBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const bookingReference = await prisma.bookingReference.create({ data: safe.data });
  const data = schemaBookingReferencePublic.parse(bookingReference);

  if (data) res.status(201).json({ data, message: "BookingReference created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new bookingReference",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidBookingReference(createBookingReference));
