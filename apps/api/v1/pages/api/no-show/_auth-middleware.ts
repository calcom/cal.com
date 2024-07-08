import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { ZNoShowInputSchema } from "@calcom/trpc/server/routers/publicViewer/noShow.schema";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;
  if (isSystemWideAdmin) {
    return;
  }

  const { bookingUid } = ZNoShowInputSchema.parse(req.body);
  if (isOrganizationOwnerOrAdmin) {
    const booking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: { userId: true },
    });
    if (booking) {
      const bookingUserId = booking.userId;
      if (bookingUserId) {
        const accessibleUsersIds = await getAccessibleUsers({
          adminUserId: userId,
          memberUserIds: [bookingUserId],
        });
        if (accessibleUsersIds.length > 0) return;
      }
    }
  }

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

  const userBookingUIds = userWithBookingsAndTeamIds.bookings.map((booking) => booking.uid);

  if (!userBookingUIds.includes(bookingUid)) {
    const teamBookings = await prisma.booking.findUnique({
      where: {
        uid: bookingUid,
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
      throw new HttpError({ statusCode: 403, message: "You are not authorized" });
    }
  }
}

export default authMiddleware;
