import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin, query } = req;
  if (isSystemWideAdmin) {
    return;
  }

  const { id } = schemaQueryIdParseInt.parse(query);
  if (isOrganizationOwnerOrAdmin) {
    const booking = await prisma.booking.findUnique({
      where: { id },
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
    },
  });

  if (!user) throw new HttpError({ statusCode: 404, message: "User not found" });

  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      bookings: {
        where: {
          OR: [
            {
              attendees: { some: { email: user.email } },
            },
            {
              eventType: {
                OR: [
                  {
                    hosts: { some: { userId } },
                  },
                  {
                    owner: { id: userId },
                  },
                  {
                    team: {
                      members: {
                        some: { userId, role: { in: ["ADMIN", "OWNER"] } },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  });

  const userBookingIds = userWithBookings?.bookings.map((booking) => booking.id);

  if (!userBookingIds?.includes(id))
    throw new HttpError({ statusCode: 403, message: "You are not authorized" });
}

export default authMiddleware;
