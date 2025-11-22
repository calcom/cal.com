import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";
import dayjs from "@calcom/dayjs";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { getTranslation } from "@calcom/lib/server/i18n";
import { APP_NAME } from "@calcom/lib/constants";
import type { Booking, EventType, User, Attendee, Payment, Prisma } from "@calcom/prisma/client";

const translator = short();

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

export async function buildNewBookingData({
  originalBooking,
  targetEventType,
  newUser,
  reassignedById,
}: BuildReassignmentBookingDataParams): Promise<Prisma.BookingCreateInput> {
  const bookerName = originalBooking.attendees[0]?.name || "Nameless";
  const newUserT = await getTranslation(newUser.locale || "en", "common");

  const newBookingTitle = getEventName({
    attendeeName: bookerName,
    eventType: targetEventType.title,
    eventName: targetEventType.eventName,
    teamName: targetEventType.team?.name,
    host: newUser.name || "Nameless",
    location: originalBooking.location || "",
    bookingFields:
      typeof originalBooking.responses === "object" &&
      originalBooking.responses !== null &&
      !Array.isArray(originalBooking.responses)
        ? (originalBooking.responses as Prisma.JsonObject)
        : null,
    eventDuration: dayjs(originalBooking.endTime).diff(originalBooking.startTime, "minutes"),
    t: newUserT,
  });

  const seed = `${newUser.username}:${dayjs(originalBooking.startTime).utc().format()}:${Date.now()}:reassignment`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

  return {
    uid,
    userPrimaryEmail: newUser.email,
    responses: originalBooking.responses === null ? undefined : originalBooking.responses,
    title: newBookingTitle,
    startTime: originalBooking.startTime,
    endTime: originalBooking.endTime,
    description: originalBooking.description,
    customInputs:
      typeof originalBooking.customInputs === "object" && 
      originalBooking.customInputs !== null &&
      !Array.isArray(originalBooking.customInputs)
        ? originalBooking.customInputs
        : undefined,
    status: originalBooking.status,
    location: originalBooking.location,
    eventType: { connect: { id: targetEventType.id } },
    smsReminderNumber: originalBooking.smsReminderNumber,
    attendees: {
      createMany: {
        data: originalBooking.attendees.map((attendee) => ({
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          locale: attendee.locale,
          phoneNumber: attendee.phoneNumber,
        })),
      },
    },
    iCalUID: `${uid}@${APP_NAME}`,
    iCalSequence: 0,
    user: { connect: { id: newUser.id } },
    payment:
      originalBooking.payment.length > 0 && originalBooking.payment[0]?.id
        ? { connect: { id: originalBooking.payment[0].id } }
        : undefined,
    metadata:
      typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
        ? originalBooking.metadata
        : undefined,
    idempotencyKey: IdempotencyKeyService.generate({
      startTime: originalBooking.startTime,
      endTime: originalBooking.endTime,
      userId: newUser.id,
      reassignedById,
    }),
  };
}

export function buildCancellationData({
  originalBooking,
  newUser,
}: {
  originalBooking: Pick<Booking, "id" | "metadata">;
  newUser: Pick<User, "name" | "email">;
}): {
  where: Prisma.BookingWhereUniqueInput;
  data: Omit<Prisma.BookingUpdateInput, "status">;
} {
  return {
    where: { id: originalBooking.id },
    data: {
      cancellationReason: `Reassigned to ${newUser.name || newUser.email}`,
      metadata:
        typeof originalBooking.metadata === "object" && originalBooking.metadata !== null
          ? originalBooking.metadata
          : undefined,
    },
  };
}