import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";
import dayjs from "@calcom/dayjs";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import { APP_NAME } from "@calcom/lib/constants";

const translator = short();

interface BuildNewBookingPlanParams {
  originalBookingFull: NonNullable<
    Awaited<ReturnType<BookingRepository["findByIdWithAttendeesPaymentAndReferences"]>>
  >;
  targetEventTypeDetails: NonNullable<Awaited<ReturnType<typeof getEventTypesFromDB>>>;
  newUser: NonNullable<Awaited<ReturnType<UserRepository["findByIdWithCredentialsAndCalendar"]>>>;
  newUserT: Awaited<ReturnType<typeof import("@calcom/lib/server/i18n")["getTranslation"]>>;
  reassignedById: number;
}

export function buildNewBookingPlan({
  originalBookingFull,
  targetEventTypeDetails,
  newUser,
  newUserT,
  reassignedById,
}: BuildNewBookingPlanParams) {
  const bookingFields =
    typeof originalBookingFull.responses === "object" &&
    originalBookingFull.responses !== null &&
    !Array.isArray(originalBookingFull.responses)
      ? originalBookingFull.responses
      : null;

  const newBookingTitle = getEventName({
    attendeeName: originalBookingFull.attendees[0]?.name || "Nameless",
    eventType: targetEventTypeDetails.title,
    eventName: targetEventTypeDetails.eventName,
    teamName: targetEventTypeDetails.team?.name,
    host: newUser.name || "Nameless",
    location: originalBookingFull.location || "",
    bookingFields,
    eventDuration: dayjs(originalBookingFull.endTime).diff(originalBookingFull.startTime, "minutes"),
    t: newUserT,
  });

  const uidSeed = `${newUser.username || "user"}:${dayjs(originalBookingFull.startTime).utc().format()}:${Date.now()}:reassignment`;
  const generatedUid = translator.fromUUID(uuidv5(uidSeed, uuidv5.URL));

  return {
    uid: generatedUid,
    userId: newUser.id,
    userPrimaryEmail: newUser.email,
    title: newBookingTitle,
    description: originalBookingFull.description,
    startTime: originalBookingFull.startTime,
    endTime: originalBookingFull.endTime,
    status: originalBookingFull.status,
    location: originalBookingFull.location,
    smsReminderNumber: originalBookingFull.smsReminderNumber,
    responses: originalBookingFull.responses === null ? undefined : originalBookingFull.responses,
    customInputs:
      typeof originalBookingFull.customInputs === "object" &&
      originalBookingFull.customInputs !== null &&
      !Array.isArray(originalBookingFull.customInputs)
        ? (originalBookingFull.customInputs as Record<string, unknown>)
        : undefined,
    metadata:
      typeof originalBookingFull.metadata === "object" && originalBookingFull.metadata !== null
        ? (originalBookingFull.metadata as Record<string, unknown>)
        : undefined,
    idempotencyKey: IdempotencyKeyService.generate({
      startTime: originalBookingFull.startTime,
      endTime: originalBookingFull.endTime,
      userId: newUser.id,
      reassignedById,
    }),
    eventTypeId: targetEventTypeDetails.id,
    attendees: originalBookingFull.attendees.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      locale: attendee.locale,
      phoneNumber: attendee.phoneNumber ?? null,
    })),
    paymentId:
      originalBookingFull.payment.length > 0 && originalBookingFull.payment[0]?.id
        ? originalBookingFull.payment[0]!.id
        : undefined,
    iCalUID: `${generatedUid}@${APP_NAME}`,
    iCalSequence: 0,
  };
}
