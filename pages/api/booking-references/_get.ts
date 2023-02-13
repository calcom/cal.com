import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingReferenceReadPublic } from "~/lib/validations/booking-reference";

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
async function getHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.BookingReferenceFindManyArgs = isAdmin ? {} : { where: { booking: { userId } } };
  const data = await prisma.bookingReference.findMany(args);
  return { booking_references: data.map((br) => schemaBookingReferenceReadPublic.parse(br)) };
}

export default defaultResponder(getHandler);
