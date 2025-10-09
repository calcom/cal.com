import dayjs from "@calcom/dayjs";
import { sendAddGuestsEmails } from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/lib/server/getUsersCredentials";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { BookingResponses } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddGuestsInputSchema } from "./addGuests.schema";

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

  // Get emails that have preventEmailImpersonation enabled
  const usersWithPreventImpersonation = await prisma.user.findMany({
    where: {
      OR: [
        {
          email: {
            in: guests.map((g) => extractBaseEmail(g).toLowerCase()),
          },
          emailVerified: {
            not: null,
          },
          preventEmailImpersonation: true,
        },
        {
          secondaryEmails: {
            some: {
              email: {
                in: guests.map((g) => extractBaseEmail(g).toLowerCase()),
              },
              emailVerified: {
                not: null,
              },
            },
          },
          preventEmailImpersonation: true,
        },
      ],
    },
    select: {
      email: true,
      emailVerified: true,
      secondaryEmails: {
        select: {
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  const protectedEmails = new Set<string>();
  usersWithPreventImpersonation.forEach((user) => {
    if (user.emailVerified) protectedEmails.add(user.email.toLowerCase());
    user.secondaryEmails.forEach((se) => {
      if (se.emailVerified) protectedEmails.add(se.email.toLowerCase());
    });
  });

  const uniqueGuests = guests.filter(
    (guest, index, self) =>
      self.indexOf(guest) === index &&
      !blacklistedGuestEmails.includes(extractBaseEmail(guest).toLowerCase()) &&
      !protectedEmails.has(extractBaseEmail(guest).toLowerCase())
  );

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
    await sendAddGuestsEmails(evt, guests);
  } catch (err) {
    console.log("Error sending AddGuestsEmails");
  }

  return { message: "Guests added" };
};
