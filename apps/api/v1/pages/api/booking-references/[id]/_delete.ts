import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /booking-references/{id}:
 *   delete:
 *     operationId: removeBookingReferenceById
 *     summary: Remove an existing booking reference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking reference to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     tags:
 *      - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference removed successfully
 *       400:
 *        description: Bad request. BookingReference id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.bookingReference.delete({ where: { id } });
  return { message: `BookingReference with id: ${id} deleted` };
}

export default defaultResponder(deleteHandler);
