import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaAvailabilityReadPublic } from "~/lib/validations/availability";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

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
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: integer
 *         description: Your API key
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/availability
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid
 *       404:
 *        description: Availability not found
 */
export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const availability = await prisma.availability.findUnique({
    where: { id },
    include: { Schedule: { select: { userId: true } } },
  });
  return { availability: schemaAvailabilityReadPublic.parse(availability) };
}

export default defaultResponder(getHandler);
