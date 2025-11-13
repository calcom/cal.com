import type { Booking, EventType, User, Attendee, Payment } from "@calcom/prisma/client";

import { NewBookingDataBuilder } from "./builders/NewBookingDataBuilder";
import { BookingCancellationDataBuilder } from "./builders/BookingCancellationDataBuilder";

interface BuildReassignmentBookingDataParams {
  originalBooking: Pick<
    Booking,
    | "id"
    | "uid"
    | "title"
    | "description"
    | "customInputs"
    | "responses"
    | "startTime"
    | "endTime"
    | "metadata"
    | "status"
    | "location"
    | "smsReminderNumber"
    | "iCalUID"
    | "iCalSequence"
    | "eventTypeId"
  > & {
    attendees: Pick<Attendee, "name" | "email" | "timeZone" | "locale" | "phoneNumber">[];
    payment: Pick<Payment, "id">[];
    eventType: EventType | null;
  };
  targetEventType: {
    id: number;
    title: string;
    eventName: string | null;
    team?: { name: string } | null;
  };
  newUser: Pick<User, "id" | "username" | "email" | "timeZone" | "locale" | "name">;
  reassignedById: number;
}

/**
 * Builds both new booking data and cancellation data for reassignment
 * This is a convenience wrapper that delegates to focused builders
 * for better testability and adherence to Single Responsibility Principle
 */
export async function buildReassignmentBookingData({
  originalBooking,
  targetEventType,
  newUser,
  reassignedById,
}: BuildReassignmentBookingDataParams) {
  // Use focused builders following Single Responsibility Principle
  const newBookingData = await NewBookingDataBuilder.build({
    originalBooking,
    targetEventType,
    newUser,
    reassignedById,
  });

  const originalBookingCancellationData = BookingCancellationDataBuilder.build({
    originalBooking,
    newUser,
  });

  return {
    newBookingData,
    originalBookingCancellationData,
  };
}

