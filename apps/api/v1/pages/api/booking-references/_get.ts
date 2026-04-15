import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { withMiddleware } from "~/lib/helpers/withMiddleware";
import { schemaBookingReferenceReadPublic } from "~/lib/validations/booking-reference";

const MAX_TAKE = 100;

const bookingReferenceSelect: Prisma.BookingReferenceSelect = {
  id: true,
  type: true,
  bookingId: true,
  uid: true,
  meetingId: true,
  meetingPassword: true,
  meetingUrl: true,
  deleted: true,
};

/**
 * @swagger
 * /booking-references:
 *   get:
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *      - in: query
 *        name: take
 *        required: false
 *        schema:
 *          type: integer
 *          minimum: 1
 *          maximum: 100
 *        description: Number of bookings to return references for (max 100)
 *      - in: query
 *        name: page
 *        required: false
 *        schema:
 *          type: integer
 *          minimum: 1
 *        description: Page number for pagination
 *     operationId: listBookingReferences
 *     summary: Find all booking references
 *     tags:
 *      - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No booking references were found
 */
export async function handler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin, pagination } = req;
  const take = Math.min(pagination.take, MAX_TAKE);
  const skip = pagination.skip;

  if (isSystemWideAdmin) {
    const data = await prisma.bookingReference.findMany({
      where: { deleted: null },
      select: bookingReferenceSelect,
      take,
      skip,
    });
    return { booking_references: data.map((br) => schemaBookingReferenceReadPublic.parse(br)) };
  }

  const bookingIds = await prisma.booking
    .findMany({
      where: { userId },
      select: { id: true },
      take,
      skip,
    })
    .then((bookings) => bookings.map((b) => b.id));

  const data = await prisma.bookingReference.findMany({
    where: { bookingId: { in: bookingIds }, deleted: null },
    select: bookingReferenceSelect,
  });

  return { booking_references: data.map((br) => schemaBookingReferenceReadPublic.parse(br)) };
}

export default withMiddleware("pagination")(defaultResponder(handler));
