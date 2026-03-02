import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import {
  type EventTypeBrandingData,
  getEventTypeService,
} from "@calcom/features/eventtypes/di/EventTypeService.container";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { getTranslation } from "@calcom/i18n/server";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";

export type TUser = Pick<NonNullable<TrpcSessionUser>, "id" | "email" | "organizationId" | "uuid"> &
  Partial<Pick<NonNullable<TrpcSessionUser>, "profile">>;

export type Booking = NonNullable<
  Awaited<ReturnType<BookingRepository["findByIdIncludeDestinationCalendar"]>>
>;

export type OrganizerData = Awaited<ReturnType<typeof getOrganizerData>>;

export async function getBooking(bookingId: number): Promise<Booking> {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdIncludeDestinationCalendar(bookingId);

  if (!booking || !booking.user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_not_found" });
  }

  return booking;
}

export async function validateUserPermissions(booking: Booking, user: TUser): Promise<void> {
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

export async function getOrganizerData(userId: number | null) {
  if (!userId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
  }

  return await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
      locale: true,
      hideBranding: true,
      profiles: {
        select: {
          organization: { select: { hideBranding: true } },
        },
      },
    },
  });
}

export async function prepareAttendeesList(attendees: Booking["attendees"]) {
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

export async function buildCalendarEvent(
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
    organizationId: booking.user?.profiles?.[0]?.organizationId ?? null,
    hideBranding: booking.eventTypeId
      ? await getEventTypeService().shouldHideBrandingForEventType(booking.eventTypeId, {
          team: booking.eventType?.team
            ? { hideBranding: booking.eventType.team.hideBranding, parent: booking.eventType.team.parent }
            : null,
          owner: {
            id: organizer.id,
            hideBranding: organizer.hideBranding,
            profiles: organizer.profiles ?? [],
          },
        } satisfies EventTypeBrandingData)
      : false,
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

export async function updateCalendarEvent(booking: Booking, evt: CalendarEvent): Promise<void> {
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
