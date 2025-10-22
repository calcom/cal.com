import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddGuestsInputSchema } from "./addGuests.schema";

type AddGuestsOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "email">;
  };
  input: TAddGuestsInputSchema;
  emailsEnabled?: boolean;
};

type Booking = NonNullable<Awaited<ReturnType<typeof getBooking>>>;
type OrganizerData = Awaited<ReturnType<typeof getOrganizerData>>;

async function getBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      attendees: true,
      eventType: true,
      destinationCalendar: true,
      references: true,
      user: {
        include: {
          destinationCalendar: true,
          credentials: true,
        },
      },
    },
  });

  if (!booking || !booking.user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_not_found" });
  }

  return booking;
}

async function validateUserPermissions(booking: Booking, userId: number, userEmail: string): Promise<void> {
  const isOrganizer = booking.userId === userId;
  const isAttendee = !!booking.attendees.find((attendee) => attendee.email === userEmail);

  let hasBookingUpdatePermission = false;
  if (booking.eventType?.teamId) {
    const permissionCheckService = new PermissionCheckService();
    hasBookingUpdatePermission = await permissionCheckService.checkPermission({
      userId: userId,
      teamId: booking.eventType.teamId,
      permission: "booking.update",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
  }

  if (!hasBookingUpdatePermission && !isOrganizer && !isAttendee) {
    throw new TRPCError({ code: "FORBIDDEN", message: "you_do_not_have_permission" });
  }
}

function validateGuestsFieldEnabled(booking: Booking): void {
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

async function getOrganizerData(userId: number) {
  return await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
  });
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

/**
 * Checks which guest emails require verification
 */
async function getEmailVerificationRequirements(guestEmails: string[]): Promise<Map<string, boolean>> {
  const userRepo = new UserRepository(prisma);
  const guestUsers = await userRepo.findManyByEmailsWithEmailVerificationSettings({ emails: guestEmails });

  const emailToRequiresVerification = new Map<string, boolean>();
  for (const user of guestUsers) {
    const matchedBase = extractBaseEmail(user.matchedEmail ?? user.email).toLowerCase();
    emailToRequiresVerification.set(matchedBase, user.requiresBookerEmailVerification === true);
  }

  return emailToRequiresVerification;
}

async function sanitizeAndFilterGuests(guests: string[], booking: Booking): Promise<string[]> {
  const deduplicatedGuests = deduplicateGuestEmails(guests);
  const blacklistedGuestEmails = getBlacklistedEmails();
  const guestEmails = deduplicatedGuests.map((email) => extractBaseEmail(email).toLowerCase());
  const emailToRequiresVerification = await getEmailVerificationRequirements(guestEmails);

  const uniqueGuests = deduplicatedGuests.filter((guest) => {
    const baseGuestEmail = extractBaseEmail(guest).toLowerCase();
    return (
      !booking.attendees.some(
        (attendee) => extractBaseEmail(attendee.email).toLowerCase() === baseGuestEmail
      ) &&
      !blacklistedGuestEmails.includes(baseGuestEmail) &&
      !emailToRequiresVerification.get(baseGuestEmail)
    );
  });

  if (uniqueGuests.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "emails_must_be_unique_valid" });
  }

  return uniqueGuests;
}

async function updateBookingWithGuests(
  bookingId: number,
  newAttendees: { name: string; email: string; timeZone: string; locale: string | null }[],
  uniqueGuests: string[],
  booking: Booking
) {
  const bookingResponses = booking.responses as BookingResponses;

  return await prisma.booking.update({
    where: {
      id: bookingId,
    },
    include: {
      attendees: true,
    },
    data: {
      attendees: {
        createMany: {
          data: newAttendees,
        },
      },
      responses: {
        ...bookingResponses,
        guests: [...(bookingResponses?.guests || []), ...uniqueGuests],
      },
    },
  });
}

async function prepareAttendeesList(attendees: Booking["attendees"]) {
  const attendeesListPromises = attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  return await Promise.all(attendeesListPromises);
}

async function buildCalendarEvent(
  booking: Booking,
  organizer: OrganizerData,
  attendeesList: Awaited<ReturnType<typeof prepareAttendeesList>>
): Promise<CalendarEvent> {
  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");
  const videoCallReference = booking.references.find((reference) => reference.type.includes("_video"));

  const evt: CalendarEvent = {
    title: booking.title || "",
    type: (booking.eventType?.title as string) || booking?.title || "",
    description: booking.description || "",
    startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
    endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
    organizer: {
      email: booking?.userPrimaryEmail ?? organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
    attendees: attendeesList,
    uid: booking.uid,
    iCalUID: booking.iCalUID,
    recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
    location: booking.location,
    destinationCalendar: booking?.destinationCalendar
      ? [booking?.destinationCalendar]
      : booking?.user?.destinationCalendar
      ? [booking?.user?.destinationCalendar]
      : [],
    seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
    seatsShowAttendees: booking.eventType?.seatsShowAttendees,
    customReplyToEmail: booking.eventType?.customReplyToEmail,
  };

  if (videoCallReference) {
    evt.videoCallData = {
      type: videoCallReference.type,
      id: videoCallReference.meetingId,
      password: videoCallReference?.meetingPassword,
      url: videoCallReference.meetingUrl,
    };
  }

  return evt;
}

async function updateCalendarEvent(booking: Booking, evt: CalendarEvent): Promise<void> {
  if (!booking.user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking user not found" });
  }

  const credentials = await getUsersCredentialsIncludeServiceAccountKey(booking.user);

  const eventManager = new EventManager({
    ...booking.user,
    credentials: [...credentials],
  });

  await eventManager.updateCalendarAttendees(evt, booking);
}

async function sendGuestNotifications(
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

export const addGuestsHandler = async ({ ctx, input, emailsEnabled = true }: AddGuestsOptions) => {
  const { user } = ctx;
  const { bookingId, guests } = input;

  const booking = await getBooking(bookingId);

  await validateUserPermissions(booking, user.id, user.email);

  validateGuestsFieldEnabled(booking);

  const organizer = await getOrganizerData(booking.userId || 0);

  const uniqueGuests = await sanitizeAndFilterGuests(guests, booking);

  const newGuestsFullDetails = uniqueGuests.map((guest) => ({
    name: "",
    email: guest,
    timeZone: organizer.timeZone,
    locale: organizer.locale,
  }));

  const bookingAttendees = await updateBookingWithGuests(
    bookingId,
    newGuestsFullDetails,
    uniqueGuests,
    booking
  );

  const attendeesList = await prepareAttendeesList(bookingAttendees.attendees);

  const evt = await buildCalendarEvent(booking, organizer, attendeesList);

  await updateCalendarEvent(booking, evt);

  if (emailsEnabled) {
    await sendGuestNotifications(evt, booking, uniqueGuests);
  }

  return { message: "Guests added" };
};
