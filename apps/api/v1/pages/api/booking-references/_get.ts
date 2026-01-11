import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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
export async function handler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const args: Prisma.BookingReferenceFindManyArgs = isSystemWideAdmin
    ? { where: { deleted: null } }
    : { where: { booking: { userId }, deleted: null } };
  const data = await prisma.bookingReference.findMany(args);
  return { booking_references: data.map((br) => schemaBookingReferenceReadPublic.parse(br)) };
}

export default defaultResponder(handler);
