import type { NextApiRequest } from "next";

import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin, query } = req;
  if (isSystemWideAdmin) {
    return;
  }

  const { id } = schemaQueryIdParseInt.parse(query);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  const hasOrgAdminPermission = user?.organizationId
    ? await checkPermissionWithFallback({
        userId,
        teamId: user.organizationId,
        permission: "organization.listMembers",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      })
    : false;

  if (hasOrgAdminPermission || isOrganizationOwnerOrAdmin) {
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

  const userWithBookings = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      bookings: true,
    },
  });

  if (!userWithBookings) throw new HttpError({ statusCode: 404, message: "User not found" });

  const filteredBookings = userWithBookings?.bookings?.filter((booking) => booking.id === id);
  const userIsHost = !!filteredBookings?.length;

  const bookingsAsAttendee = prisma.booking.findMany({
    where: {
      id,
      attendees: { some: { email: userWithBookings.email } },
    },
  });

  const bookingsAsEventTypeOwner = prisma.booking.findMany({
    where: {
      id,
      eventType: {
        owner: { id: userId },
      },
    },
  });

  const bookingsAsTeamOwnerOrAdmin = prisma.booking.findMany({
    where: {
      id,
      eventType: {
        team: {
          members: {
            some: { userId, role: { in: ["ADMIN", "OWNER"] }, accepted: true },
          },
        },
      },
    },
  });

  const [resultOne, resultTwo, resultThree] = await Promise.all([
    bookingsAsAttendee,
    bookingsAsEventTypeOwner,
    bookingsAsTeamOwnerOrAdmin,
  ]);

  const teamBookingsAsOwnerOrAdmin = [...resultOne, ...resultTwo, ...resultThree];
  const userHasTeamBookings = !!teamBookingsAsOwnerOrAdmin.length;

  if (!userIsHost && !userHasTeamBookings)
    throw new HttpError({ statusCode: 403, message: "You are not authorized" });
}

export default authMiddleware;
