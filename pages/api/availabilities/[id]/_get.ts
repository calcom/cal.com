import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaAvailabilityReadPublic } from "@lib/validations/availability";
import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /availabilities/{id}:
 *   get:
 *     operationId: getAvailabilityById
 *     summary: Find an availability
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the availability to get
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Unauthorized
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const availability = await prisma.availability.findUnique({
    where: { id },
    include: { Schedule: { select: { userId: true } } },
  });
  return { availability: schemaAvailabilityReadPublic.parse(availability) };
}

export default defaultResponder(getHandler);
