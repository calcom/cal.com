import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

interface FindTargetChildEventTypeParams {
  bookingId: number;
  newUserId: number;
}

interface FindTargetChildEventTypeResult {
  currentChildEventType: {
    id: number;
    parentId: number;
    userId: number | null;
  };
  parentEventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
  targetChildEventType: {
    id: number;
    parentId: number;
    userId: number | null;
  };
  originalBooking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
}

/**
 * Finds and validates the target child event type for managed event reassignment
 * 
 * @throws Error if booking is not on a managed event type
 * @throws Error if parent is not MANAGED type
 * @throws Error if target user doesn't have a child event type
 * @returns Current child, parent, and target child event types
 */
export async function findTargetChildEventType({
  bookingId,
  newUserId,
}: FindTargetChildEventTypeParams): Promise<FindTargetChildEventTypeResult> {
  // 1. Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      eventTypeId: true,
      userId: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!booking.eventTypeId) {
    throw new Error("Booking does not have an event type");
  }

  // 2. Get the current child event type and check if it has a parent
  const currentChildEventType = await prisma.eventType.findUnique({
    where: { id: booking.eventTypeId },
    select: {
      id: true,
      parentId: true,
      userId: true,
      schedulingType: true,
    },
  });

  if (!currentChildEventType) {
    throw new Error("Event type not found");
  }

  if (!currentChildEventType.parentId) {
    throw new Error("Booking is not on a managed event type");
  }

  // 3. Get and verify the parent event type
  const parentEventType = await getEventTypesFromDB(currentChildEventType.parentId);

  if (!parentEventType) {
    throw new Error("Parent event type not found");
  }

  if (parentEventType.schedulingType !== SchedulingType.MANAGED) {
    throw new Error("Parent event type must be a MANAGED type");
  }

  // 4. Find the target child event type for the new user
  const targetChildEventType = await prisma.eventType.findUnique({
    where: {
      userId_parentId: {
        userId: newUserId,
        parentId: currentChildEventType.parentId,
      },
    },
    select: {
      id: true,
      parentId: true,
      userId: true,
    },
  });

  if (!targetChildEventType) {
    throw new Error(
      `User ${newUserId} does not have a child event type for this managed event. ` +
      `Only users who are assigned to the parent managed event can be reassigned to.`
    );
  }

  // 5. Validate not reassigning to the same user
  if (currentChildEventType.userId === newUserId) {
    throw new Error("Cannot reassign to the same user");
  }

  // 6. Ensure target child event type has parentId
  if (!targetChildEventType.parentId) {
    throw new Error("Target child event type is missing parentId");
  }

  return {
    currentChildEventType: {
      id: currentChildEventType.id,
      parentId: currentChildEventType.parentId,
      userId: currentChildEventType.userId,
    },
    parentEventType,
    targetChildEventType: {
      id: targetChildEventType.id,
      parentId: targetChildEventType.parentId,
      userId: targetChildEventType.userId,
    },
    originalBooking: booking,
  };
}

