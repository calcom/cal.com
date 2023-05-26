import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, prisma, isAdmin, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    include: { bookings: true },
  });

  if (!userWithBookings) throw new HttpError({ statusCode: 404, message: "User not found" });

  const userBookingIds = userWithBookings.bookings.map((booking) => booking.id);

  if (!isAdmin && !userBookingIds.includes(id)) {
    throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  }
}

export default authMiddleware;
