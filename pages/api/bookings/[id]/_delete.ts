import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Remove an existing booking
 *     operationId: removeBookingById
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the booking to delete
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: OK, booking removed successfuly
 *       400:
 *        description: Bad request. Booking id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.booking.delete({ where: { id } });
  return { message: `Booking with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
