import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { Prisma } from "@calcom/prisma/client";
import type { Booking, EventType, User, Attendee, Payment } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

interface BuildReassignmentBookingDataParams {
  originalBooking: Booking & {
    attendees: Attendee[];
    payment: Payment[];
    eventType: EventType | null;
  };
  targetEventType: {
    id: number;
    title: string;
    eventName: string | null;
    team?: { name: string } | null;
  };
  newUser: User;
  reassignReason?: string;
  reassignedById: number;
  originalUserId: number;
}

export function buildReassignmentBookingData({
  originalBooking,
  targetEventType,
  newUser,
  reassignReason,
  reassignedById,
  originalUserId,
}: BuildReassignmentBookingDataParams) {
  // Regenerate title with new host name
  const bookerName =
    originalBooking.attendees.find((att) => !att.email.includes("@"))?.name || "Nameless";
  
  // Create a minimal TFunction for event naming (no translation needed for reassignment)
  const mockT = ((key: string) => key) as TFunction;
  
  const newBookingTitle = getEventName({
    attendeeName: bookerName,
    eventType: targetEventType.title,
    eventName: targetEventType.eventName,
    teamName: targetEventType.team?.name,
    host: newUser.name || "Nameless",
    location: originalBooking.location || "",
    bookingFields: originalBooking.responses as Prisma.JsonObject,
    eventDuration: dayjs(originalBooking.endTime).diff(originalBooking.startTime, "minutes"),
    t: mockT,
  });

  // Build attendees data (copy from original)
  const attendeesData = originalBooking.attendees.map((attendee) => ({
    name: attendee.name,
    email: attendee.email,
    timeZone: attendee.timeZone,
    locale: attendee.locale,
    phoneNumber: attendee.phoneNumber,
  }));

  // New booking data
  const newBookingData: Prisma.BookingCreateInput = {
    uid: originalBooking.uid, // Keep same UID for continuity
    userPrimaryEmail: newUser.email,
    responses: originalBooking.responses === null ? Prisma.JsonNull : (originalBooking.responses as Prisma.InputJsonValue),
    title: newBookingTitle,
    startTime: originalBooking.startTime,
    endTime: originalBooking.endTime,
    description: originalBooking.description,
    customInputs: isPrismaObjOrUndefined(originalBooking.customInputs),
    status: originalBooking.status, // Preserve status (ACCEPTED/PENDING)
    location: originalBooking.location,
    eventType: {
      connect: { id: targetEventType.id },
    },
    smsReminderNumber: originalBooking.smsReminderNumber,
    attendees: {
      createMany: {
        data: attendeesData,
      },
    },
    iCalUID: originalBooking.iCalUID || "",
    iCalSequence: (originalBooking.iCalSequence || 0) + 1, // Increment sequence
    user: {
      connect: { id: newUser.id },
    },
    // Link payment if exists
    payment: originalBooking.payment.length > 0 && originalBooking.payment[0]?.id
      ? { connect: { id: originalBooking.payment[0].id } }
      : undefined,
    // Store reassignment metadata
    metadata: {
      ...(typeof originalBooking.metadata === "object" ? originalBooking.metadata : {}),
      reassignment: {
        fromBookingId: originalBooking.id,
        fromUserId: originalUserId,
        fromEventTypeId: originalBooking.eventTypeId,
        reason: reassignReason,
        reassignedAt: new Date().toISOString(),
        reassignedById,
      },
    },
    idempotencyKey: IdempotencyKeyService.generate({
      startTime: originalBooking.startTime,
      endTime: originalBooking.endTime,
      userId: newUser.id,
      reassignedById,
    }),
  };

  // Original booking cancellation data
  const originalBookingCancellationData: Prisma.BookingUpdateArgs = {
    where: { id: originalBooking.id },
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason: `Reassigned to ${newUser.name || newUser.email}`,
      metadata: {
        ...(typeof originalBooking.metadata === "object" ? originalBooking.metadata : {}),
        reassignment: {
          reassignedToUserId: newUser.id,
          reassignedToEventTypeId: targetEventType.id,
          reason: reassignReason,
          reassignedAt: new Date().toISOString(),
          reassignedById,
        },
      },
    },
  };

  return {
    newBookingData,
    originalBookingCancellationData,
  };
}

