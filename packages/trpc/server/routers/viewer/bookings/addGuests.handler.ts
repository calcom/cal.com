import dayjs from "@calcom/dayjs";
import { sendAddGuestsEmails } from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { createUserActor } from "@calcom/features/bookings/lib/types/actor";
import { AttendeeAddedAuditActionService } from "@calcom/features/booking-audit/lib/actions/AttendeeAddedAuditActionService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import { checkEmailVerificationRequired } from "../../publicViewer/checkIfUserEmailVerificationRequired.handler";

import type { TrpcSessionUser } from "../../../types";
import type { TAddGuestsInputSchema } from "./addGuests.schema";

const log = logger.getSubLogger({ prefix: ["addGuests.handler"] });

type AddGuestsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddGuestsInputSchema;
};
export const addGuestsHandler = async ({ ctx, input }: AddGuestsOptions) => {
  const { user } = ctx;
  const { bookingId, guests } = input;

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

  if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "booking_not_found" });

  const isOrganizer = booking.userId === user.id;
  const isAttendee = !!booking.attendees.find((attendee) => attendee.email === user.email);

  let hasBookingUpdatePermission = false;
  if (booking.eventType?.teamId) {
    const permissionCheckService = new PermissionCheckService();
    hasBookingUpdatePermission = await permissionCheckService.checkPermission({
      userId: user.id,
      teamId: booking.eventType.teamId,
      permission: "booking.update",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
  }

  if (!hasBookingUpdatePermission && !isOrganizer && !isAttendee) {
    throw new TRPCError({ code: "FORBIDDEN", message: "you_do_not_have_permission" });
  }

  const organizer = await prisma.user.findUniqueOrThrow({
    where: {
      id: booking.userId || 0,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
  });

  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",").map((email) => email.toLowerCase())
    : [];

  // Normalize and deduplicate guests with proper email handling
  const normalizedGuests = guests.map((guest) => ({
    original: guest,
    normalized: extractBaseEmail(guest).toLowerCase(),
  }));

  // Filter unique guests with proper deduplication
  const seenEmails = new Set<string>();
  const uniqueGuests: string[] = [];

  for (const guestEntry of normalizedGuests) {
    const baseEmail = guestEntry.normalized;

    // Skip if already in the set (deduplication)
    if (seenEmails.has(baseEmail)) {
      continue;
    }

    // Skip if already an attendee (case-insensitive)
    if (
      booking.attendees.some(
        (attendee) => extractBaseEmail(attendee.email).toLowerCase() === baseEmail
      )
    ) {
      continue;
    }

    // Skip if blacklisted
    if (blacklistedGuestEmails.includes(baseEmail)) {
      continue;
    }

    // Check if email verification is required
    const verificationRequired = await checkEmailVerificationRequired({
      userSessionEmail: ctx.user.email,
      email: guestEntry.original,
    });

    if (verificationRequired) {
      continue;
    }

    seenEmails.add(baseEmail);
    uniqueGuests.push(guestEntry.original);
  }

  if (uniqueGuests.length === 0)
    throw new TRPCError({ code: "BAD_REQUEST", message: "emails_must_be_unique_valid" });

  const guestsFullDetails = uniqueGuests.map((guest) => {
    return {
      name: "",
      email: guest,
      timeZone: organizer.timeZone,
      locale: organizer.locale,
    };
  });

  const bookingResponses = booking.responses as BookingResponses;
  const oldGuestCount = booking.attendees.length;

  const bookingAttendees = await prisma.booking.update({
    where: {
      id: bookingId,
    },
    include: {
      attendees: true,
    },
    data: {
      attendees: {
        createMany: {
          data: guestsFullDetails,
        },
      },
      responses: {
        ...bookingResponses,
        guests: [...(bookingResponses?.guests || []), ...uniqueGuests],
      },
    },
  });

  try {
    const bookingEventHandlerService = getBookingEventHandlerService();
    const auditData = {
      addedGuests: uniqueGuests,
      changes: [{ field: "attendees", oldValue: oldGuestCount, newValue: bookingAttendees.attendees.length }],
    };
    await bookingEventHandlerService.onAttendeeAdded(String(bookingId), createUserActor(user.id), auditData);
  } catch (error) {
    log.error("Failed to create booking audit log for adding guests", error);
  }

  const attendeesListPromises = bookingAttendees.attendees.map(async (attendee) => {
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

  const attendeesList = await Promise.all(attendeesListPromises);
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

  const credentials = await getUsersCredentialsIncludeServiceAccountKey(ctx.user);

  const eventManager = new EventManager({
    ...user,
    credentials: [...credentials],
  });

  await eventManager.updateCalendarAttendees(evt, booking);

  try {
    await sendAddGuestsEmails(evt, uniqueGuests);
  } catch {
    log.error("Error sending AddGuestsEmails");
  }

  return { message: "Guests added" };
};
