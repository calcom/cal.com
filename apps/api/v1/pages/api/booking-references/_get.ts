import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { PrismaBookingReferenceRepository } from "@calcom/lib/server/repository/PrismaBookingReferenceRepository";
import { prisma } from "@calcom/prisma";

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
  const { userId } = req;
  const bookingReferenceRepo = new PrismaBookingReferenceRepository(prisma);
  return {
    booking_references: await bookingReferenceRepo.findByUserId({ userId }),
  };
}

export default defaultResponder(getHandler);
