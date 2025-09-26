import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { PrismaBookingReferenceRepository } from "@calcom/lib/server/repository/PrismaBookingReferenceRepository";
import { prisma } from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /booking-references/{id}:
 *   get:
 *     operationId: getBookingReferenceById
 *     summary: Find a booking reference
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the booking reference to get
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *      - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: BookingReference was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const bookingReferenceRepo = new PrismaBookingReferenceRepository(prisma);
  return {
    booking_reference: bookingReferenceRepo.findBookingReferenceById(id),
  };
}

export default defaultResponder(getHandler);
