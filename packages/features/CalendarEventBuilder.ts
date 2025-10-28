import { BookingRepository } from "bookings/repositories/BookingRepository";
import type { TFunction } from "i18next";

import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat, type TimeFormat } from "@calcom/lib/timeFormat";
import type { Attendee, Prisma, User } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import { BookingResponses } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person, CalEventResponses, AppsStatus } from "@calcom/types/Calendar";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";

type BookingForCalEventBuilder = NonNullable<
  Awaited<ReturnType<BookingRepository["getBookingForCalEventBuilder"]>>
>;
type MetaOptions = {
  bookerUrl?: string;
  attendeeSeatId?: string;
  conferenceCredentialId?: number;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  // Add other fields here if needed in the future
};

// --- Helper Functions ---
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
   * Static factory method to create and populate a builder from a booking object.
   * @param booking - The fully fetched booking object.
   * @param meta - Optional object containing supplementary data or overrides.
   * @returns A promise resolving to the configured CalendarEventBuilder instance.
   */
  static async fromBooking(
    booking: BookingForCalEventBuilder,
    meta?: MetaOptions
  ): Promise<CalendarEventBuilder> {
    if (!booking.user) throw new Error(`Booking ${booking.uid} is missing an organizer.`);
    if (!booking.eventType) throw new Error(`Booking ${booking.uid} eventType not found.`);

    const builder = new CalendarEventBuilder();
    const { eventType, user: organizerUser } = booking;
    const additionalNotes = booking.description || undefined;

    // Prepare data
    if (!organizerUser.id) {
      throw new Error("Organizer user does not have an id");
    }
    const organizerPerson = await _buildPersonFromUser(organizerUser);
    const attendeesList = await Promise.all(booking.attendees.map((att) => _buildPersonFromAttendee(att)));
    const videoRef = booking.references.find((r) => r.type.endsWith("_video"));
    const videoCallData = videoRef
      ? {
          type: videoRef.type,
          id: videoRef.meetingId,
          password: videoRef.meetingPassword,
          url: videoRef.meetingUrl,
        }
      : undefined;

    // Use values from meta or defaults
    const bookerUrl = meta?.bookerUrl ?? "https://cal.com"; // Default bookerUrl
    const attendeeSeatId = meta?.attendeeSeatId;
    const conferenceCredentialId = meta?.conferenceCredentialId;
    const platformRescheduleUrl = meta?.platformRescheduleUrl ?? "";
    const platformCancelUrl = meta?.platformCancelUrl ?? "";
    const platformBookingUrl = meta?.platformBookingUrl ?? "";

    // Call chain using extracted data and meta values
    builder
      .withBasicDetails({
        bookerUrl: bookerUrl, // Use derived/default value
        title: booking.title,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        additionalNotes,
      })
      .withEventType({
        slug: eventType.slug,
        description: eventType.description,
        id: eventType.id,
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
        customInputs: (booking.customInputs as Prisma.JsonObject) || null,
        // TODO: format responses and userFieldsResponses using booking responses and eventtype booker fields
        responses: booking.responses as BookingResponses,
        userFieldsResponses: {}, // Keep default empty
      })
      .withLocation({
        location: booking.location,
        conferenceCredentialId: conferenceCredentialId, // Use value from meta
      })
      //TODO: handle multiple destination calendars
      .withDestinationCalendar(booking.destinationCalendar)
      .withIdentifiers({ iCalUID: booking.iCalUID || undefined, iCalSequence: booking.iCalSequence })
      .withConfirmation({
        requiresConfirmation: !!eventType.requiresConfirmation,
        isConfirmedByDefault: !eventType.requiresConfirmation,
      })
      .withPlatformVariables({
        platformClientId: (booking.metadata as Prisma.JsonObject)?.platformClientId as string | undefined,
        platformRescheduleUrl: platformRescheduleUrl, // Use derived/default value
        platformCancelUrl: platformCancelUrl, // Use derived/default value
        platformBookingUrl: platformBookingUrl, // Use derived/default value
      })
      // todo double check this
      .withRecurring(
        eventType.recurringEvent
          ? (eventType.recurringEvent as {
              count: number;
              freq: number;
              interval: number;
            })
          : undefined
      )
      .withUid(booking.uid)
      .withOneTimePassword(booking.oneTimePassword);

    // Handle optional fields/relations based on booking and meta
    if (attendeeSeatId) {
      builder.withAttendeeSeatId(attendeeSeatId); // Use value from meta
    }

    if (videoCallData?.id && videoCallData.password && videoCallData.url) {
      builder.withVideoCallData({
        ...videoCallData,
        id: videoCallData.id,
        password: videoCallData.password,
        url: videoCallData.url,
      });
      builder.withAppsStatus([
        { appName: videoCallData.type, type: videoCallData.type, success: 1, failures: 0, errors: [] },
      ]);
    } else {
      builder.withAppsStatus([]);
    }

    if (eventType.team) {
      const members = await Promise.all(
        eventType.team.members.map(async (m) => await _buildPersonFromUser(m.user))
      );
      builder.withTeam({ id: eventType.team.id, name: eventType.team.name || "", members: members });
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
