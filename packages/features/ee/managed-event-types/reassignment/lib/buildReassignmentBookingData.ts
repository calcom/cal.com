import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { getTranslation } from "@calcom/lib/server/i18n";
import { Prisma } from "@calcom/prisma/client";
import type { Booking, EventType, User, Attendee, Payment } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

const translator = short();

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

export async function buildReassignmentBookingData({
  originalBooking,
  targetEventType,
  newUser,
  reassignReason,
  reassignedById,
  originalUserId,
}: BuildReassignmentBookingDataParams) {
  // Regenerate title with new host name using proper translation
  const bookerName =
    originalBooking.attendees.find((att) => !att.email.includes("@"))?.name || "Nameless";
  
  // Get translation function for the new user's locale
  const newUserT = await getTranslation(newUser.locale || "en", "common");
  
  const newBookingTitle = getEventName({
    attendeeName: bookerName,
    eventType: targetEventType.title,
    eventName: targetEventType.eventName,
    teamName: targetEventType.team?.name,
    host: newUser.name || "Nameless",
    location: originalBooking.location || "",
    bookingFields: originalBooking.responses as Prisma.JsonObject,
    eventDuration: dayjs(originalBooking.endTime).diff(originalBooking.startTime, "minutes"),
    t: newUserT,
  });

  // Build attendees data (copy from original)
  const attendeesData = originalBooking.attendees.map((attendee) => ({
    name: attendee.name,
    email: attendee.email,
    timeZone: attendee.timeZone,
    locale: attendee.locale,
    phoneNumber: attendee.phoneNumber,
  }));

  // Generate a new unique UID for the reassigned booking
  const seed = `${newUser.username}:${dayjs(originalBooking.startTime).utc().format()}:${new Date().getTime()}:reassignment`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  // New booking data
  const newBookingData: Prisma.BookingCreateInput = {
    uid,
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
      ...(typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
        ? originalBooking.metadata
        : {}),
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
        ...(typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
          ? originalBooking.metadata
          : {}),
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

