import { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingReadPublic } from "@lib/validations/booking";
import { schemaQuerySingleOrMultipleUserIds } from "@lib/validations/shared/queryUserId";

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Find all bookings
 *     operationId: listBookings
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookings were found
 */
async function handler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.BookingFindManyArgs = isAdmin ? {} : { where: { userId } };
  /** Only admins can query other users */
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    args.where = { userId: { in: userIds } };
  }
  const data = await prisma.booking.findMany(args);
  return { bookings: data.map((booking) => schemaBookingReadPublic.parse(booking)) };
}

export default defaultResponder(handler);
