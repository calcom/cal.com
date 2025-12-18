import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PrismaOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

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
    const eventTypeRepository = new EventTypeRepository(prisma);

    const eventTypeForUser = await eventTypeRepository.findByIdIfUserIsHostOrAssignee({
      eventTypeId,
      userId: loggedInUserId,
    });

    if (eventTypeForUser) return true;
  }

  // Team admin/owner
  if (teamId) {
    const membership = await MembershipRepository.getAdminOrOwnerMembership(loggedInUserId, teamId);
    if (membership) return true;
  }

  // Org admin/owner of booking host
  if (
    bookingUserId &&
    (await PrismaOrgMembershipRepository.isLoggedInUserOrgAdminOfBookingHost(loggedInUserId, bookingUserId))
  ) {
    return true;
  }

  return false;
};
