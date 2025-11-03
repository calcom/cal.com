import { enrichUsersWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking/ensureAvailableUsers";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { IsFixedAwareUser } from "@calcom/features/bookings/lib/handleNewBooking/types";
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

/**
 * Automatically reassign a managed event booking to the best available user
 * 
 * Uses LuckyUserService to select the best user based on weights, priorities,
 * and least recently booked criteria, then delegates to manual reassignment.
 */
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

  // 1. Validate the booking can be reassigned
  await validateManagedEventReassignment({ bookingId });

  // 2. Get the booking and current child event type
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      eventTypeId: true,
      userId: true,
      startTime: true,
      endTime: true,
    },
  });

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

  // 3. Get parent event type to verify it's MANAGED
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

  // 4. Get all child event types (sibling events for other users)
  const allChildEventTypes = await prisma.eventType.findMany({
    where: {
      parentId: currentChildEventType.parentId,
      userId: {
        not: currentChildEventType.userId, // Exclude current user
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

  // 5. Enrich users with selected calendars and delegation credentials
  const usersWithSelectedCalendars = users.map((user) => withSelectedCalendars(user));
  const enrichedUsers = await enrichUsersWithDelegationCredentials({
    orgId,
    users: usersWithSelectedCalendars,
  });

  // 6. Check availability for all users at the booking time
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

  // 7. Use LuckyUserService to select the best user
  const luckyUserService = getLuckyUserService();
  
  const selectedUser = await luckyUserService.getLuckyUser({
    availableUsers,
    eventType: parentEventType,
    allRRHosts: [], // Not applicable for managed events
    routingFormResponse: null,
  });

  if (!selectedUser) {
    throw new Error("Failed to select a user for reassignment");
  }

  reassignLogger.info(`Selected user ${selectedUser.id} for reassignment`);

  // 8. Delegate to manual reassignment with auto-reassignment flag
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

