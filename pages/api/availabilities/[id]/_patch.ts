import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import {
  schemaAvailabilityEditBodyParams,
  schemaAvailabilityReadPublic,
} from "@lib/validations/availability";
import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /availabilities/{id}:
 *   patch:
 *     operationId: editAvailabilityById
 *     summary: Edit an existing availability
 *     requestBody:
 *       description: Edit an existing availability related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: array
 *                 example: email@example.com
 *               startTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *               endTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the availability to edit
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       201:
 *         description: OK, availability edited successfully
 *       400:
 *        description: Bad request. Availability body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaAvailabilityEditBodyParams.parse(body);
  const availability = await prisma.availability.update({
    where: { id },
    data,
    include: { Schedule: { select: { userId: true } } },
  });
  return { availability: schemaAvailabilityReadPublic.parse(availability) };
}

export default defaultResponder(patchHandler);
