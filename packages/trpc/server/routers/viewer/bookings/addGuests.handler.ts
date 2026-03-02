import process from "node:process";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { makeUserActor } from "@calcom/features/booking-audit/lib/makeActor";
import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { TRPCError } from "@trpc/server";
import type { TAddGuestsInputSchema } from "./addGuests.schema";
import {
  type Booking,
  buildCalendarEvent,
  getBooking,
  getOrganizerData,
  type OrganizerData,
  prepareAttendeesList,
  type TUser,
  updateCalendarEvent,
  validateUserPermissions,
} from "./bookingAttendees.utils";

export type { Booking, OrganizerData, TUser } from "./bookingAttendees.utils";
export { getBooking, validateUserPermissions, getOrganizerData, prepareAttendeesList, buildCalendarEvent, updateCalendarEvent } from "./bookingAttendees.utils";

type AddGuestsOptions = {
  ctx: {
    user: TUser;
  };
  input: TAddGuestsInputSchema;
  emailsEnabled?: boolean;
  actionSource: ValidActionSource;
};

export const addGuestsHandler = async ({
  ctx,
  input,
  emailsEnabled = true,
  actionSource,
}: AddGuestsOptions) => {
  const { user } = ctx;
  const { bookingId, guests } = input;

  const booking = await getBooking(bookingId);

  await validateUserPermissions(booking, user);

  validateGuestsFieldEnabled(booking);

  const organizer = await getOrganizerData(booking.userId);

  const uniqueGuests = await sanitizeAndFilterGuests(guests, booking);

  const newGuestsDetails = uniqueGuests.map((guest) => ({
    name: guest.name || "",
    email: guest.email,
    timeZone: guest.timeZone || organizer.timeZone,
    locale: guest.language || organizer.locale,
  }));

  const uniqueGuestEmails = uniqueGuests.map((guest) => guest.email);

  const bookingAttendees = await updateBookingAttendees(
    bookingId,
    newGuestsDetails,
    uniqueGuestEmails,
    booking
  );

  // Capture new attendee emails after update for audit logging
  const newAttendeeEmails = bookingAttendees.attendees.map((attendee) => attendee.email);

  const attendeesList = await prepareAttendeesList(bookingAttendees.attendees);

  const evt = await buildCalendarEvent(booking, organizer, attendeesList);

  await updateCalendarEvent(booking, evt);

  if (emailsEnabled) {
    await sendGuestNotifications(evt, booking, uniqueGuestEmails);
  }

  const bookingEventHandlerService = getBookingEventHandlerService();
  const featuresRepository = getFeaturesRepository();
  const organizationId = user.organizationId ?? null;
  const isBookingAuditEnabled = organizationId
    ? await featuresRepository.checkIfTeamHasFeature(organizationId, "booking-audit")
    : false;

  await bookingEventHandlerService.onAttendeeAdded({
    bookingUid: booking.uid,
    actor: makeUserActor(user.uuid),
    organizationId,
    source: actionSource,
    auditData: {
      added: uniqueGuestEmails,
    },
    isBookingAuditEnabled,
  });

  return { message: "Guests added" };
};

export function validateGuestsFieldEnabled(booking: Booking): void {
  const parsedBookingFields = booking?.eventType?.bookingFields
    ? eventTypeBookingFields.parse(booking.eventType.bookingFields)
    : [];

  const guestsBookingField = parsedBookingFields.find((field) => field.name === "guests");
  if (guestsBookingField?.hidden) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot add guests to this booking. The guests field is disabled for event type "${booking?.eventType?.title}" (ID: ${booking?.eventTypeId}). Please contact the event organizer to enable guest additions.`,
    });
  }
}

function deduplicateGuestEmails(guests: string[]): string[] {
  const seenBaseEmails = new Set<string>();
  return guests.filter((guest) => {
    const baseEmail = extractBaseEmail(guest).toLowerCase();
    if (seenBaseEmails.has(baseEmail)) {
      return false;
    }
    seenBaseEmails.add(baseEmail);
    return true;
  });
}

function getBlacklistedEmails(): string[] {
  return process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",").map((email) => email.toLowerCase())
    : [];
}

async function getEmailVerificationRequirements(guestEmails: string[]): Promise<Map<string, boolean>> {
  const userRepo = new UserRepository(prisma);
  const guestUsers = await userRepo.findManyByEmailsWithEmailVerificationSettings({
    emails: guestEmails,
  });

  const emailToRequiresVerification = new Map<string, boolean>();
  for (const user of guestUsers) {
    const matchedBase = extractBaseEmail(user.matchedEmail ?? user.email).toLowerCase();
    emailToRequiresVerification.set(matchedBase, user.requiresBookerEmailVerification === true);
  }

  return emailToRequiresVerification;
}

export async function sanitizeAndFilterGuests(
  guests: Array<{
    email: string;
    name?: string;
    timeZone?: string;
    phoneNumber?: string;
    language?: string;
  }>,
  booking: Booking
): Promise<
  Array<{
    email: string;
    name?: string;
    timeZone?: string;
    phoneNumber?: string;
    language?: string;
  }>
> {
  const guestEmails = guests.map((guest) => guest.email);
  const deduplicatedGuests = deduplicateGuestEmails(guestEmails);
  const blacklistedGuestEmails = getBlacklistedEmails();
  const guestEmailsLowerCase = deduplicatedGuests.map((email) => extractBaseEmail(email).toLowerCase());
  const emailToRequiresVerification = await getEmailVerificationRequirements(guestEmailsLowerCase);

  // Create a map of email to guest object for easy lookup
  const emailToGuestMap = new Map(
    guests.map((guest) => [extractBaseEmail(guest.email).toLowerCase(), guest])
  );

  const uniqueGuestEmails = deduplicatedGuests.filter((email) => {
    const baseGuestEmail = extractBaseEmail(email).toLowerCase();
    return (
      !booking.attendees.some(
        (attendee) => extractBaseEmail(attendee.email).toLowerCase() === baseGuestEmail
      ) &&
      !blacklistedGuestEmails.includes(baseGuestEmail) &&
      !emailToRequiresVerification.get(baseGuestEmail)
    );
  });

  if (uniqueGuestEmails.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "emails_must_be_unique_valid",
    });
  }

  // Return the full guest objects for unique emails
  return uniqueGuestEmails
    .map((email) => emailToGuestMap.get(extractBaseEmail(email).toLowerCase()))
    .filter((guest): guest is NonNullable<typeof guest> => guest !== undefined);
}

export async function updateBookingAttendees(
  bookingId: number,
  newAttendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
  }[],
  uniqueGuestEmails: string[],
  booking: Booking
) {
  const bookingResponses = booking.responses as BookingResponses;
  const bookingRepository = new BookingRepository(prisma);

  return await bookingRepository.updateBookingAttendees({
    bookingId,
    newAttendees,
    updatedResponses: {
      ...bookingResponses,
      guests: [...(bookingResponses?.guests || []), ...uniqueGuestEmails],
    },
  });
}

export async function sendGuestNotifications(
  evt: CalendarEvent,
  booking: Booking,
  uniqueGuests: string[]
): Promise<void> {
  const emailsAndSmsHandler = new BookingEmailSmsHandler({
    logger: logger,
  });

  await emailsAndSmsHandler.handleAddGuests({
    evt,
    eventType: {
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(booking?.eventType?.metadata),
      schedulingType: booking.eventType?.schedulingType || null,
    },
    newGuests: uniqueGuests,
  });
}
