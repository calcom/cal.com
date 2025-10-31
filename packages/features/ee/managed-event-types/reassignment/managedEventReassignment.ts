import dayjs from "@calcom/dayjs";
import { getLuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { checkIfUserAvailableWithTimes } from "@calcom/features/ee/round-robin/utils/checkIfUserAvailableWithTimes";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { PlatformClientParams } from "@calcom/prisma/zod-utils";

import { managedEventManualReassignment } from "./managedEventManualReassignment";
import { validateManagedEventReassignment } from "./utils";

interface ManagedEventReassignmentParams {
  bookingId: number;
  orgId: number | null;
  reassignReason?: string;
  reassignedById: number;
  _emailsEnabled?: boolean;
  _platformClientParams?: PlatformClientParams;
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
  _emailsEnabled = true,
  _platformClientParams,
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
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          timeZone: true,
          locale: true,
          defaultScheduleId: true,
        },
      },
    },
  });

  if (allChildEventTypes.length === 0) {
    throw new Error("No other users available for reassignment in this managed event");
  }

  reassignLogger.info(`Found ${allChildEventTypes.length} potential reassignment targets`);

  // 5. Check availability for each user at the booking time
  const availableUsers = [];
  
  for (const childEventType of allChildEventTypes) {
    if (!childEventType.user) continue;

    try {
      const isAvailable = await checkIfUserAvailableWithTimes({
        user: {
          ...childEventType.user,
          defaultScheduleId: childEventType.user.defaultScheduleId ?? undefined,
        },
        dateFrom: dayjs(booking.startTime).format(),
        dateTo: dayjs(booking.endTime).format(),
        timeZone: childEventType.user.timeZone,
      });

      if (isAvailable) {
        availableUsers.push({
          id: childEventType.user.id,
          email: childEventType.user.email,
          name: childEventType.user.name,
          username: childEventType.user.username,
          timeZone: childEventType.user.timeZone,
          weight: 100, // Default weight for managed events
          priority: 2,  // Default priority for managed events
        });
      }
    } catch (error) {
      reassignLogger.warn(`Error checking availability for user ${childEventType.user.id}`, error);
    }
  }

  if (availableUsers.length === 0) {
    throw new Error("No users available at the booking time");
  }

  reassignLogger.info(`${availableUsers.length} users available at booking time`);

  // 6. Use LuckyUserService to select the best user
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

  reassignLogger.info(`Selected user ${selectedUser.id} (${selectedUser.email}) for reassignment`);

  // 7. Delegate to manual reassignment
  return await managedEventManualReassignment({
    bookingId,
    newUserId: selectedUser.id,
    _orgId: orgId,
    reassignReason,
    reassignedById,
    _emailsEnabled,
    _platformClientParams,
  });
}

export default managedEventReassignment;

