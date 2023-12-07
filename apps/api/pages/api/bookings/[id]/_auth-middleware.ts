import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, prisma, isAdmin, query } = req;
  if (isAdmin) {
    return;
  }

  const { id } = schemaQueryIdParseInt.parse(query);
  const userWithBookingsAndTeamIds = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookings: true,
      teams: {
        select: {
          teamId: true,
        },
      },
    },
  });

  if (!userWithBookingsAndTeamIds) throw new HttpError({ statusCode: 404, message: "User not found" });

  const userBookingIds = userWithBookingsAndTeamIds.bookings.map((booking) => booking.id);

  if (!userBookingIds.includes(id)) {
    const teamBookings = await prisma.booking.findUnique({
      where: {
        id: id,
        eventType: {
          team: {
            id: {
              in: userWithBookingsAndTeamIds.teams.map((team) => team.teamId),
            },
          },
        },
      },
    });

    if (!teamBookings) {
      throw new HttpError({ statusCode: 401, message: "You are not authorized" });
    }
  }
}

export default authMiddleware;
