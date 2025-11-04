import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { sendPendingGuestConfirmationEmail } from "@calcom/emails/email-manager";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
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

type TUser = Pick<NonNullable<TrpcSessionUser>, "id" | "email" | "organizationId"> &
  Partial<Pick<NonNullable<TrpcSessionUser>, "profile">>;

type AddGuestsOptions = {
  ctx: {
    user: TUser;
  };
  input: TAddGuestsInputSchema;
  emailsEnabled?: boolean;
};

type Booking = NonNullable<Awaited<ReturnType<BookingRepository["findByIdIncludeDestinationCalendar"]>>>;
type OrganizerData = Awaited<ReturnType<typeof getOrganizerData>>;

export const addGuestsHandler = async ({ ctx, input, emailsEnabled = true }: AddGuestsOptions) => {
  const { user } = ctx;
  const { bookingId, guests } = input;

  const booking = await getBooking(bookingId);

  await validateUserPermissions(booking, user);

  validateGuestsFieldEnabled(booking);

  const organizer = await getOrganizerData(booking.userId);

  const { regularGuests, pendingGuests } = await sanitizeAndFilterGuests(guests, booking);

  const bookingRepository = new BookingRepository(prisma);

  // Handle regular guests (add as attendees)
  if (regularGuests.length > 0) {
    const newGuestsDetails = regularGuests.map((guest) => ({
      name: guest.name || "",
      email: guest.email,
      timeZone: guest.timeZone || organizer.timeZone,
      locale: guest.language || organizer.locale,
    }));

    const uniqueGuestEmails = regularGuests.map((guest) => guest.email);

    const bookingAttendees = await updateBookingAttendees(
      bookingId,
      newGuestsDetails,
      uniqueGuestEmails,
      booking
    );

    const attendeesList = await prepareAttendeesList(bookingAttendees.attendees);

    const evt = await buildCalendarEvent(booking, organizer, attendeesList);

    await updateCalendarEvent(booking, evt);

    if (emailsEnabled) {
      await sendGuestNotifications(evt, booking, uniqueGuestEmails);
    }
  }

  // Handle pending guests (create pending guest records and send confirmation emails)
  if (pendingGuests.length > 0 && emailsEnabled) {
    await createPendingGuestsAndSendEmails({
      booking,
      pendingGuests,
      organizer,
      bookingRepository,
    });
  }

  return { message: "Guests added" };
};

async function getBooking(bookingId: number) {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdIncludeDestinationCalendar(bookingId);

  if (!booking || !booking.user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_not_found" });
  }

  return booking;
}

async function validateUserPermissions(booking: Booking, user: TUser): Promise<void> {
  const isOrganizer = booking.userId === user.id;
  const isAttendee = !!booking.attendees.find((attendee) => attendee.email === user.email);

  let hasBookingUpdatePermission = false;
  if (booking.eventType?.teamId) {
    const permissionCheckService = new PermissionCheckService();
    hasBookingUpdatePermission = await permissionCheckService.checkPermission({
      userId: user.id,
      teamId: booking.eventType?.teamId,
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

async function getOrganizerData(userId: number | null) {
  if (!userId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
  }

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

async function sanitizeAndFilterGuests(
  guests: Array<{
    email: string;
    name?: string;
    timeZone?: string;
    phoneNumber?: string;
    language?: string;
  }>,
  booking: Booking
): Promise<{
  regularGuests: Array<{
    email: string;
    name?: string;
    timeZone?: string;
    phoneNumber?: string;
    language?: string;
  }>;
  pendingGuests: Array<{
    email: string;
    name?: string;
    timeZone?: string;
    phoneNumber?: string;
    language?: string;
  }>;
}> {
  const guestEmails = guests.map((guest) => guest.email);
  const deduplicatedGuests = deduplicateGuestEmails(guestEmails);
  const blacklistedGuestEmails = getBlacklistedEmails();
  const guestEmailsLowerCase = deduplicatedGuests.map((email) => extractBaseEmail(email).toLowerCase());
  const emailToRequiresVerification = await getEmailVerificationRequirements(guestEmailsLowerCase);

  // Create a map of email to guest object for easy lookup
  const emailToGuestMap = new Map(
    guests.map((guest) => [extractBaseEmail(guest.email).toLowerCase(), guest])
  );

  const regularGuestEmails: string[] = [];
  const pendingGuestEmails: string[] = [];

  for (const email of deduplicatedGuests) {
    const baseGuestEmail = extractBaseEmail(email).toLowerCase();

    // Skip if already an attendee
    if (
      booking.attendees.some((attendee) => extractBaseEmail(attendee.email).toLowerCase() === baseGuestEmail)
    ) {
      continue;
    }

    // Skip if blacklisted
    if (blacklistedGuestEmails.includes(baseGuestEmail)) {
      continue;
    }

    // Check if requires verification
    if (emailToRequiresVerification.get(baseGuestEmail)) {
      pendingGuestEmails.push(email);
    } else {
      regularGuestEmails.push(email);
    }
  }

  if (regularGuestEmails.length === 0 && pendingGuestEmails.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "emails_must_be_unique_valid" });
  }

  // Return the full guest objects for unique emails
  const regularGuests = regularGuestEmails
    .map((email) => emailToGuestMap.get(extractBaseEmail(email).toLowerCase()))
    .filter((guest): guest is NonNullable<typeof guest> => guest !== undefined);

  const pendingGuests = pendingGuestEmails
    .map((email) => emailToGuestMap.get(extractBaseEmail(email).toLowerCase()))
    .filter((guest): guest is NonNullable<typeof guest> => guest !== undefined);

  return { regularGuests, pendingGuests };
}

async function updateBookingAttendees(
  bookingId: number,
  newAttendees: { name: string; email: string; timeZone: string; locale: string | null }[],
  uniqueGuestEmails: string[],
  booking: Booking
) {
  const bookingResponses = (booking.responses || {}) as BookingResponses;
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

async function createPendingGuestsAndSendEmails({
  booking,
  pendingGuests,
  organizer,
  bookingRepository,
}: {
  booking: Booking;
  pendingGuests: Array<{
    email: string;
    name?: string;
    timeZone?: string;
    language?: string;
  }>;
  organizer: OrganizerData;
  bookingRepository: BookingRepository;
}): Promise<void> {
  const pendingGuestsData = pendingGuests.map((guest) => ({
    email: guest.email,
    name: guest.name || "",
    timeZone: guest.timeZone || organizer.timeZone,
    locale: guest.language || organizer.locale || undefined,
  }));

  await bookingRepository.createPendingGuests({
    bookingId: booking.id,
    pendingGuests: pendingGuestsData,
  });

  const tAttendees = await getTranslation(organizer.locale ?? "en", "common");

  for (const guest of pendingGuests) {
    await sendPendingGuestConfirmationEmail({
      language: tAttendees,
      guest: {
        email: guest.email,
        name: guest.name || "",
      },
      booking: {
        uid: booking.uid,
        title: booking.title || "",
      },
      organizer: {
        name: organizer.name || "",
        email: organizer.email,
      },
    });
  }

  logger.info("Created pending guests and sent confirmation emails", {
    count: pendingGuests.length,
    bookingId: booking.id,
  });
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
