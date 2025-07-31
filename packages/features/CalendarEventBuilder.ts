import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { CalendarEvent, Person, CalEventResponses, AppsStatus } from "@calcom/types/Calendar";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";

export class CalendarEventBuilder {
  private event: Partial<CalendarEvent>;

  constructor(existingEvent?: Partial<CalendarEvent>) {
    this.event = existingEvent || {};
  }

  static fromEvent(event: Partial<CalendarEvent>) {
    return new CalendarEventBuilder(event);
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

  build(): CalendarEvent {
    // Validate required fields
    if (
      !this.event.startTime ||
      !this.event.endTime ||
      !this.event.type ||
      !this.event.bookerUrl ||
      !this.event.title
    ) {
      throw new Error("Missing required fields for calendar event");
    }

    return this.event as CalendarEvent;
  }
}
