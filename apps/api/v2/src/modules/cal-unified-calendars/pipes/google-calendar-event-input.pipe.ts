import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { PipeTransform, Injectable } from "@nestjs/common";

import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";
import { UpdateDateTimeWithZone } from "../inputs/update-unified-calendar-event.input";
import {
  CalendarEventResponseStatus,
  CalendarEventStatus,
  CalendarEventHost,
} from "../outputs/get-unified-calendar-event";

interface GoogleCalendarEventInputTransform {
  transform(
    updateData: UpdateUnifiedCalendarEventInput,
    existingEvent?: GoogleCalendarEventResponse | null
  ): any;
}

@Injectable()
export class GoogleCalendarEventInputPipe implements GoogleCalendarEventInputTransform {
  transform(
    updateData: UpdateUnifiedCalendarEventInput,
    existingEvent?: GoogleCalendarEventResponse | null
  ): any {
    const updatePayload: any = {};

    if (updateData.title !== undefined) {
      updatePayload.summary = updateData.title;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    if (updateData.start) {
      updatePayload.start = this.transformDateTimeWithZone(updateData.start);
    }

    if (updateData.end) {
      updatePayload.end = this.transformDateTimeWithZone(updateData.end);
    }

    if (updateData.attendees !== undefined || updateData.hosts !== undefined) {
      updatePayload.attendees = this.transformAttendeesWithHostsHandling(
        updateData.attendees,
        updateData.hosts,
        existingEvent
      );
    }

    if (updateData.status !== undefined) {
      updatePayload.status = this.transformEventStatus(updateData.status);
    }

    return updatePayload;
  }

  private transformDateTimeWithZone(dateTime: UpdateDateTimeWithZone): {
    dateTime: string;
    timeZone: string;
  } {
    return {
      dateTime: dateTime.time || "",
      timeZone: dateTime.timeZone || "",
    };
  }

  private transformAttendees(
    attendees: Array<{
      email: string;
      name?: string;
      responseStatus?: CalendarEventResponseStatus | null;
      optional?: boolean;
    }>
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
  }> {
    return attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.name,
      responseStatus: this.transformResponseStatus(attendee.responseStatus),
      optional: attendee.optional,
    }));
  }

  private transformAttendeesWithHostsHandling(
    userAttendees?: Array<{
      email: string;
      name?: string;
      responseStatus?: CalendarEventResponseStatus | null;
      optional?: boolean;
    }>,
    userHosts?: CalendarEventHost[],
    existingEvent?: GoogleCalendarEventResponse | null
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    const transformedUserAttendees = userAttendees ? this.transformAttendees(userAttendees) : [];

    if (userHosts && userHosts.length > 0) {
      const transformedHosts = userHosts.map((host) => ({
        email: host.email,
        displayName: host.name,
        responseStatus: this.transformResponseStatus(host.responseStatus),
        optional: false, // Hosts are typically not optional
        organizer: true,
      }));

      return [...transformedUserAttendees, ...transformedHosts];
    }

    if (userAttendees && existingEvent?.attendees) {
      const existingOrganizerAttendees = existingEvent.attendees.filter(
        (attendee) => attendee.organizer === true
      );

      if (existingOrganizerAttendees.length > 0) {
        const userAttendeeEmails = new Set(userAttendees.map((attendee) => attendee.email.toLowerCase()));
        const organizersToPreserve = existingOrganizerAttendees.filter(
          (organizer) => !userAttendeeEmails.has(organizer.email.toLowerCase())
        );

        const preservedOrganizers = organizersToPreserve.map((organizer) => ({
          email: organizer.email,
          displayName: organizer.displayName,
          responseStatus: organizer.responseStatus || "needsAction",
          optional: organizer.optional,
          organizer: true,
        }));

        return [...transformedUserAttendees, ...preservedOrganizers];
      }
    }

    return transformedUserAttendees;
  }

  private transformResponseStatus(responseStatus?: CalendarEventResponseStatus | null): string {
    if (!responseStatus) return "needsAction";

    switch (responseStatus) {
      case CalendarEventResponseStatus.ACCEPTED:
        return "accepted";
      case CalendarEventResponseStatus.PENDING:
        return "tentative";
      case CalendarEventResponseStatus.DECLINED:
        return "declined";
      case CalendarEventResponseStatus.NEEDS_ACTION:
        return "needsAction";
      default:
        return "needsAction";
    }
  }

  private transformEventStatus(status?: CalendarEventStatus | null): string {
    if (!status) return "confirmed";

    switch (status) {
      case CalendarEventStatus.ACCEPTED:
        return "confirmed";
      case CalendarEventStatus.PENDING:
        return "tentative";
      case CalendarEventStatus.CANCELLED:
        return "cancelled";
      case CalendarEventStatus.DECLINED:
        return "cancelled";
      default:
        return "confirmed";
    }
  }
}
