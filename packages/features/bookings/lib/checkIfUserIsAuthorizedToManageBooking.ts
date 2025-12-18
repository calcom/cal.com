import { PrismaOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";

type CheckIfUserIsAuthorizedToManageBookingParams = {
  eventTypeId: number | null;
  loggedInUserId: number;
  teamId?: number | null;
  bookingUserId: number | null;
  userRole: string;
};

export const checkIfUserIsAuthorizedToManageBooking = async ({
  eventTypeId,
  loggedInUserId,
  teamId,
  bookingUserId,
  userRole,
}: CheckIfUserIsAuthorizedToManageBookingParams): Promise<boolean> => {
  // System-wide admin
  if (userRole === UserPermissionRole.ADMIN) return true;

  // Organizer/owner of the booking
  if (bookingUserId === loggedInUserId) return true;

  // Associated with the event type (host or assigned user)
  if (eventTypeId) {
    const [loggedInUserAsHostOfEventType, loggedInUserAsUserOfEventType] = await Promise.all([
      prisma.eventType.findUnique({
        where: {
          id: eventTypeId,
          hosts: { some: { userId: loggedInUserId } },
        },
        select: { id: true },
      }),
      prisma.eventType.findUnique({
        where: {
          id: eventTypeId,
          users: { some: { id: loggedInUserId } },
        },
        select: { id: true },
      }),
    ]);

    if (loggedInUserAsHostOfEventType || loggedInUserAsUserOfEventType) return true;
  }

  // Team admin/owner
  if (teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: loggedInUserId,
        teamId: teamId,
        role: {
          in: [MembershipRole.OWNER, MembershipRole.ADMIN],
        },
      },
    });
    if (membership) return true;
  }

  // Org admin/owner of booking host
  if (
    bookingUserId &&
    (await PrismaOrgMembershipRepository.isLoggedInUserOrgAdminOfBookingHost(
      loggedInUserId,
      bookingUserId
    ))
  ) {
    return true;
  }

  return false;
};
