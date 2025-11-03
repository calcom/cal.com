import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import type { TFunction } from "i18next";

import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat, type TimeFormat } from "@calcom/lib/timeFormat";
import type { Attendee, DestinationCalendar, Prisma, User } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import { bookingResponses as bookingResponsesSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person, CalEventResponses, AppsStatus } from "@calcom/types/Calendar";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";

type BookingForCalEventBuilder = NonNullable<
  Awaited<ReturnType<BookingRepository["getBookingForCalEventBuilder"]>>
>;
type BookingMetaOptions = {
  conferenceCredentialId?: number;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
};

async function _buildPersonFromUser(
  user: Pick<User, "id" | "name" | "locale" | "username" | "email" | "timeFormat" | "timeZone">
) {
  const translate = await getTranslation(user.locale ?? "en", "common");
  return {
    id: user.id,
    name: user.name || "Nameless",
    email: user.email,
    username: user.username || undefined,
    timeZone: user.timeZone,
    language: { translate, locale: user.locale ?? "en" },
    timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
  } satisfies Person;
}

async function _buildPersonFromAttendee(attendee: Pick<Attendee, "locale" | "name" | "timeZone" | "email">) {
  const translate = await getTranslation(attendee.locale ?? "en", "common");

  return {
    name: attendee.name ?? "",
    email: attendee.email,
    timeZone: attendee.timeZone,
    language: { translate, locale: attendee.locale ?? "en" },
  } satisfies Person;
}

export class CalendarEventBuilder {
  private event: Partial<CalendarEvent>;

  constructor(existingEvent?: Partial<CalendarEvent>) {
    this.event = existingEvent || {};
  }

  static fromEvent(event: Partial<CalendarEvent>) {
    return new CalendarEventBuilder(event);
  }

  /**
   * Builds a CalendarEventBuilder instance from a booking.
   */
  static async fromBooking(
    booking: BookingForCalEventBuilder,
    meta: BookingMetaOptions = {}
  ): Promise<CalendarEventBuilder> {
    const { uid, user, eventType } = booking;

    if (!user) throw new Error(`Booking ${uid} is missing an organizer — user may have been deleted.`);
    if (!eventType) throw new Error(`Booking ${uid} is missing eventType — it may have been deleted.`);

    const builder = new CalendarEventBuilder();
    const {
      description,
      attendees,
      references,
      title,
      startTime,
      endTime,
      location,
      responses,
      customInputs,
      iCalUID,
      iCalSequence,
      oneTimePassword,
      seatsReferences,
    } = booking;

    const {
      conferenceCredentialId,
      platformRescheduleUrl = "",
      platformClientId = "",
      platformCancelUrl = "",
      platformBookingUrl = "",
    } = meta;

    const organizerPerson = await _buildPersonFromUser(user);
    const attendeesList = await Promise.all(attendees.map(_buildPersonFromAttendee));
    const additionalNotes = description || undefined;

    const videoRef = references.find((r) => r.type.endsWith("_video"));
    const videoCallData = videoRef
      ? {
          type: videoRef.type,
          id: videoRef.meetingId,
          password: videoRef.meetingPassword,
          url: videoRef.meetingUrl,
        }
      : undefined;

    const organizationId = user.profiles?.[0]?.organizationId ?? null;
    const bookerUrl = await getBookerBaseUrl(eventType.team?.parentId ?? organizationId);

    const parsedBookingResponses = bookingResponsesSchema.safeParse(responses);
    const bookingResponses = parsedBookingResponses.success ? parsedBookingResponses.data : null;

    const calEventResponses = getCalEventResponses({
      booking,
      bookingFields: eventType.bookingFields,
    });

    // custom inputs are the old system to record booking responses
    const parsedCustomInputs =
      typeof customInputs === "object" ? (customInputs as Record<string, string>) : null;

    const recurring = parseRecurringEvent(eventType.recurringEvent) ?? undefined;

    // Base builder setup
    builder
      .withBasicDetails({
        bookerUrl,
        title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        additionalNotes,
      })
      .withEventType({
        id: eventType.id,
        slug: eventType.slug,
        description: eventType.description,
        hideCalendarNotes: eventType.hideCalendarNotes,
        hideCalendarEventDetails: eventType.hideCalendarEventDetails,
        hideOrganizerEmail: eventType.hideOrganizerEmail,
        schedulingType: eventType.schedulingType,
        seatsPerTimeSlot: eventType.seatsPerTimeSlot,
        seatsShowAttendees: !!eventType.seatsShowAttendees,
        seatsShowAvailabilityCount: !!eventType.seatsShowAvailabilityCount,
        customReplyToEmail: eventType.customReplyToEmail,
        disableRescheduling: eventType.disableRescheduling ?? false,
        disableCancelling: eventType.disableCancelling ?? false,
      })
      .withOrganizer(organizerPerson)
      .withAttendees(attendeesList)
      .withMetadataAndResponses({
        additionalNotes,
        customInputs: parsedCustomInputs,
        responses: calEventResponses.responses,
        userFieldsResponses: calEventResponses.userFieldsResponses,
      })
      .withLocation({ location, conferenceCredentialId })
      .withIdentifiers({ iCalUID: iCalUID || undefined, iCalSequence })
      .withConfirmation({
        requiresConfirmation: !!eventType.requiresConfirmation,
        isConfirmedByDefault: !eventType.requiresConfirmation,
      })
      .withPlatformVariables({
        platformClientId,
        platformRescheduleUrl,
        platformCancelUrl,
        platformBookingUrl,
      })
      .withRecurring(recurring)
      .withUid(uid)
      .withOneTimePassword(oneTimePassword);

    // Seats
    if (seatsReferences?.length && bookingResponses) {
      const currentSeat = seatsReferences.find(
        (s) =>
          s.attendee.email === bookingResponses.email ||
          (bookingResponses.attendeePhoneNumber &&
            s.attendee.phoneNumber === bookingResponses.attendeePhoneNumber)
      );
      if (currentSeat) builder.withAttendeeSeatId(currentSeat.referenceUid);
    }

    // Video
    if (videoCallData && videoCallData.id && videoCallData.password && videoCallData.url) {
      builder
        .withVideoCallData({
          ...videoCallData,
          id: videoCallData.id,
          password: videoCallData.password,
          url: videoCallData.url,
        })
        .withAppsStatus([
          { appName: videoCallData.type, type: videoCallData.type, success: 1, failures: 0, errors: [] },
        ]);
    } else {
      builder.withAppsStatus([]);
    }

    // Team & calendars
    if (eventType.team) {
      const hostsWithoutOrganizer = await Promise.all(
        eventType.hosts.filter((h) => h.user.email !== user.email).map((h) => _buildPersonFromUser(h.user))
      );

      const hostCalendars = [
        ...eventType.hosts.map((h) => h.user.destinationCalendar).filter(Boolean),
        user.destinationCalendar,
      ].filter(Boolean) as NonNullable<DestinationCalendar>[];

      builder
        .withTeam({
          id: eventType.team.id,
          name: eventType.team.name || "",
          members: hostsWithoutOrganizer,
        })
        .withDestinationCalendar(hostCalendars);
    } else if (user.destinationCalendar) {
      builder.withDestinationCalendar([user.destinationCalendar]);
    }

    return builder;
  }

  withBasicDetails({
    bookerUrl,
    title,
    startTime,
    endTime,
    additionalNotes,
  }: {
    bookerUrl: string;
    title: string;
    startTime: string;
    endTime: string;
    additionalNotes?: string;
  }) {
    this.event = {
      ...this.event,
      bookerUrl,
      title,
      startTime,
      endTime,
      additionalNotes,
    };
    return this;
  }

  withEventType(eventType: {
    slug: string;
    description?: string | null;
    id: number;
    hideCalendarNotes?: boolean;
    hideCalendarEventDetails?: boolean;
    hideOrganizerEmail?: boolean;
    schedulingType?: SchedulingType | null;
    seatsPerTimeSlot?: number | null;
    seatsShowAttendees?: boolean | null;
    seatsShowAvailabilityCount?: boolean | null;
    customReplyToEmail?: string | null;
    disableRescheduling?: boolean;
    disableCancelling?: boolean;
  }) {
    this.event = {
      ...this.event,
      type: eventType.slug,
      description: eventType.description,
      eventTypeId: eventType.id,
      hideCalendarNotes: eventType.hideCalendarNotes,
      hideCalendarEventDetails: eventType.hideCalendarEventDetails,
      hideOrganizerEmail: eventType.hideOrganizerEmail,
      schedulingType: eventType.schedulingType,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      // if seats are not enabled we should default true
      seatsShowAttendees: eventType.seatsPerTimeSlot ? eventType.seatsShowAttendees : true,
      seatsShowAvailabilityCount: eventType.seatsPerTimeSlot ? eventType.seatsShowAvailabilityCount : true,
      customReplyToEmail: eventType.customReplyToEmail,
      disableRescheduling: eventType.disableRescheduling ?? false,
      disableCancelling: eventType.disableCancelling ?? false,
    };
    return this;
  }

  withOrganizer(organizer: {
    id: number;
    name: string | null;
    email: string;
    username?: string;
    usernameInOrg?: string;
    timeZone: string;
    timeFormat?: TimeFormat;
    language: {
      translate: TFunction;
      locale: string;
    };
  }) {
    this.event = {
      ...this.event,
      organizer: {
        id: organizer.id,
        name: organizer.name || "Nameless",
        email: organizer.email,
        username: organizer.username,
        usernameInOrg: organizer.usernameInOrg,
        timeZone: organizer.timeZone,
        language: organizer.language,
        timeFormat: organizer.timeFormat,
      },
    };
    return this;
  }

  withAttendees(attendees: Person[]) {
    this.event = {
      ...this.event,
      attendees,
    };
    return this;
  }

  withMetadataAndResponses({
    additionalNotes,
    customInputs,
    responses,
    userFieldsResponses,
  }: {
    additionalNotes?: string | null;
    customInputs?: Prisma.JsonObject | null;
    responses?: CalEventResponses | null;
    userFieldsResponses?: CalEventResponses | null;
  }) {
    this.event = {
      ...this.event,
      additionalNotes,
      customInputs,
      responses,
      userFieldsResponses,
    };
    return this;
  }

  withLocation({
    location,
    conferenceCredentialId,
  }: {
    location: string | null;
    conferenceCredentialId?: number;
  }) {
    this.event = {
      ...this.event,
      location,
      conferenceCredentialId,
    };
    return this;
  }

  withDestinationCalendar(destinationCalendar: CalendarEvent["destinationCalendar"]) {
    this.event = {
      ...this.event,
      destinationCalendar,
    };
    return this;
  }

  withIdentifiers({ iCalUID, iCalSequence }: { iCalUID?: string; iCalSequence?: number }) {
    this.event = {
      ...this.event,
      iCalUID: iCalUID ?? this.event.iCalUID,
      iCalSequence: iCalSequence ?? this.event.iCalSequence,
    };
    return this;
  }

  withConfirmation({
    requiresConfirmation,
    isConfirmedByDefault,
  }: {
    requiresConfirmation: boolean;
    isConfirmedByDefault: boolean;
  }) {
    this.event = {
      ...this.event,
      requiresConfirmation,
      oneTimePassword: isConfirmedByDefault ? null : undefined,
    };
    return this;
  }

  withPlatformVariables({
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
  }: {
    platformClientId?: string | null;
    platformRescheduleUrl?: string | null;
    platformCancelUrl?: string | null;
    platformBookingUrl?: string | null;
  }) {
    this.event = {
      ...this.event,
      platformClientId,
      platformRescheduleUrl,
      platformCancelUrl,
      platformBookingUrl,
    };
    return this;
  }

  withAppsStatus(appsStatus?: AppsStatus[]) {
    this.event = {
      ...this.event,
      appsStatus,
    };
    return this;
  }

  withVideoCallData(videoCallData?: VideoCallData) {
    this.event = {
      ...this.event,
      videoCallData,
    };
    return this;
  }

  withTeam(team?: { name: string; members: Person[]; id: number }) {
    this.event = {
      ...this.event,
      team,
    };
    return this;
  }

  withRecurring(recurringEvent?: { count: number; freq: number; interval: number }) {
    this.event = {
      ...this.event,
      recurringEvent,
    };
    return this;
  }

  withAttendeeSeatId(attendeeSeatId?: string) {
    this.event = {
      ...this.event,
      attendeeSeatId,
    };
    return this;
  }

  withUid(uid: string | null) {
    this.event = {
      ...this.event,
      uid,
    };
    return this;
  }

  withRecurringEventId(recurringEventId: string) {
    this.event = {
      ...this.event,
      existingRecurringEvent: {
        recurringEventId,
      },
    };
    return this;
  }

  withOneTimePassword(oneTimePassword?: string | null) {
    this.event = {
      ...this.event,
      oneTimePassword,
    };
    return this;
  }

  build(): CalendarEvent | null {
    // Validate required fields
    if (
      !this.event.startTime ||
      !this.event.endTime ||
      !this.event.type ||
      !this.event.bookerUrl ||
      !this.event.title
    ) {
      return null;
    }

    return this.event as CalendarEvent;
  }
}
