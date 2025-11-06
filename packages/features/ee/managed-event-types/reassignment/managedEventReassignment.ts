import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { userSelect } from "@calcom/prisma/selects/user";

import { managedEventManualReassignment } from "./managedEventManualReassignment";
import { validateManagedEventReassignment } from "./utils";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  emailsEnabled?: boolean;
}


export async function managedEventReassignment({
  bookingId,
  orgId,
  reassignReason = "Auto-reassigned to another team member",
  reassignedById,
  emailsEnabled = true,
}: ManagedEventReassignmentParams) {
  const reassignLogger = logger.getSubLogger({
    prefix: ["managedEventReassignment", `${bookingId}`],
  });

  reassignLogger.info(`User ${reassignedById} initiating auto-reassignment`);

  await validateManagedEventReassignment({ bookingId });

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdForReassignment(bookingId);

  if (!booking || !booking.eventTypeId) {
    throw new Error("Booking or event type not found");
  }

  const currentChildEventType = await prisma.eventType.findUnique({
    where: { id: booking.eventTypeId },
    select: {
      id: true,
      parentId: true,
      userId: true,
    },
  });

  if (!currentChildEventType || !currentChildEventType.parentId) {
    throw new Error("Booking is not on a managed event type");
  }

  const parentEventType = await getEventTypesFromDB(currentChildEventType.parentId);

  if (!parentEventType) {
    throw new Error("Parent event type not found");
  }

  if (parentEventType.schedulingType !== SchedulingType.MANAGED) {
    throw new Error("Parent event type must be a MANAGED type");
  }

  reassignLogger.info("Found parent managed event type", {
    parentId: parentEventType.id,
    currentChildId: currentChildEventType.id,
  });

  const allChildEventTypes = await prisma.eventType.findMany({
    where: {
      parentId: currentChildEventType.parentId,
      userId: {
        not: currentChildEventType.userId,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  const userIds = allChildEventTypes.map((et) => et.userId).filter((id): id is number => id !== null);
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      ...userSelect,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
    },
  });

  if (users.length === 0) {
    throw new Error("No other users available for reassignment in this managed event");
  }

  reassignLogger.info(`Found ${users.length} potential reassignment targets`);

  const usersWithSelectedCalendars = users.map((user) => withSelectedCalendars(user));
  const enrichedUsers = await enrichUsersWithDelegationCredentials({
    orgId,
    users: usersWithSelectedCalendars,
  });

  const allUsers = enrichedUsers.map(user => ({
    ...user,
    isFixed: false,
  })) as IsFixedAwareUser[];

  const availableUsers = await ensureAvailableUsers(
    { ...parentEventType, users: allUsers },
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: parentEventType.timeZone || allUsers[0]?.timeZone || "UTC",
    },
    reassignLogger
  );

  if (availableUsers.length === 0) {
    throw new Error("No users available at the booking time");
  }

  reassignLogger.info(`${availableUsers.length} users available at booking time`);

  const luckyUserService = getLuckyUserService();
  
  const selectedUser = await luckyUserService.getLuckyUser({
    availableUsers,
    eventType: parentEventType,
    allRRHosts: [],
    routingFormResponse: null,
  });

  if (!selectedUser) {
    throw new Error("Failed to select a user for reassignment");
  }

  reassignLogger.info(`Selected user ${selectedUser.id} for reassignment`);

  return await managedEventManualReassignment({
    bookingId,
    newUserId: selectedUser.id,
    orgId,
    reassignReason,
    reassignedById,
    emailsEnabled,
    isAutoReassignment: true,
  });
}

export default managedEventReassignment;

