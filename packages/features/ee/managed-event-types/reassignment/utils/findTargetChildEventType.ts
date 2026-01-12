import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { SchedulingType } from "@calcom/prisma/enums";

interface FindTargetChildEventTypeParams {
  bookingId: number;
  newUserId: number;
  bookingRepository: BookingRepository;
  eventTypeRepository: EventTypeRepository;
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
 * Pure function that finds and validates the target child event type for managed event reassignment
 * 
 * Dependencies are injected via parameters - no direct instantiation of repositories
 * 
 * @param bookingRepository - Injected booking repository
 * @param eventTypeRepository - Injected event type repository
 * @throws Error if booking is not on a managed event type
 * @throws Error if parent is not MANAGED type
 * @throws Error if target user doesn't have a child event type
 * @returns Current child, parent, and target child event types
 */
export async function findTargetChildEventType({
  bookingId,
  newUserId,
  bookingRepository,
  eventTypeRepository,
}: FindTargetChildEventTypeParams): Promise<FindTargetChildEventTypeResult> {
  const booking = await bookingRepository.findByIdForWithUserIdAndEventTypeId(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!booking.eventTypeId) {
    throw new Error("Booking does not have an event type");
  }

  const currentChildEventType = await eventTypeRepository.findByIdWithParentAndUserId(booking.eventTypeId);

  if (!currentChildEventType) {
    throw new Error("Event type not found");
  }

  if (!currentChildEventType.parentId) {
    throw new Error("Booking is not on a managed event type");
  }

  const parentEventType = await getEventTypesFromDB(currentChildEventType.parentId);

  if (!parentEventType) {
    throw new Error("Parent event type not found");
  }

  if (parentEventType.schedulingType !== SchedulingType.MANAGED) {
    throw new Error("Parent event type must be a MANAGED type");
  }

  const targetChildEventType = await eventTypeRepository.findByIdTargetChildEventType(newUserId, currentChildEventType.parentId);

  if (!targetChildEventType) {
    throw new Error(
      `User ${newUserId} does not have a child event type for this managed event. ` +
      `Only users who are assigned to the parent managed event can be reassigned to.`
    );
  }

  if (currentChildEventType.userId === newUserId) {
    throw new Error("Cannot reassign to the same user");
  }

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

