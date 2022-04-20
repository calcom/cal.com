import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { BookingReferenceResponse, BookingReferencesResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import {
  schemaBookingReferenceBodyParams,
  schemaBookingReferencePublic,
} from "@lib/validations/booking-reference";

/**
 * @swagger
 * /v1/booking-references:
 *   get:
 *     summary: Get all booking references
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No booking references were found
 *   post:
 *     summary: Creates a new  booking reference
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK,  booking reference created
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllBookingReferences(
  req: NextApiRequest,
  res: NextApiResponse<BookingReferencesResponse | BookingReferenceResponse>
) {
  const { method } = req;
  const userId = getCalcomUserId(res);
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });
  if (!userWithBookings) throw new Error("User not found");
  const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
  if (method === "GET") {
    const data = await prisma.bookingReference.findMany({ where: { id: { in: userBookingIds } } });
    const booking_references = data.map((bookingReference) =>
      schemaBookingReferencePublic.parse(bookingReference)
    );
    if (booking_references) res.status(200).json({ booking_references });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No BookingReferences were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaBookingReferenceBodyParams.safeParse(req.body);
    if (!safe.success) {
      throw new Error("Invalid request body");
    }

    // const booking_reference = schemaBookingReferencePublic.parse(data);
    const userId = getCalcomUserId(res);
    const userWithBookings = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: true },
    });
    if (!userWithBookings) {
      throw new Error("User not found");
    }
    const userBookingIds = userWithBookings.bookings.map((booking: any) => booking.id).flat();
    if (userBookingIds.includes(safe.data.bookingId)) {
      const booking_reference = await prisma.bookingReference.create({
        data: { ...safe.data },
      });
      if (booking_reference) {
        res.status(201).json({
          booking_reference,
          message: "BookingReference created successfully",
        });
      } else {
        (error: Error) =>
          res.status(400).json({
            message: "Could not create new booking reference",
            error,
          });
      }
    } else res.status(401).json({ message: "Unauthorized" });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllBookingReferences);
