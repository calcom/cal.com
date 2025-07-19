import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { PipeTransform, Injectable } from "@nestjs/common";

import {
  UpdateUnifiedCalendarEventInput,
  UpdateCalendarEventAttendee,
  UpdateCalendarEventHost,
} from "../inputs/update-unified-calendar-event.input";
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

  private transformAttendees(attendees: UpdateCalendarEventAttendee[]): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
  }> {
    return attendees
      .filter((attendee) => attendee.action !== "delete")
      .map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: this.transformResponseStatus(attendee.responseStatus),
        optional: attendee.optional,
      }));
  }

  private transformAttendeesWithHostsHandling(
    inputAttendees?: UpdateCalendarEventAttendee[],
    inputHosts?: UpdateCalendarEventHost[],
    existingEvent?: GoogleCalendarEventResponse | null
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    let finalAttendees = this.preserveExistingAttendees(existingEvent);

    if (inputAttendees) {
      finalAttendees = this.processAttendeeDeletions(finalAttendees, inputAttendees);
      finalAttendees = this.processAttendeeUpdatesAndAdditions(finalAttendees, inputAttendees);
    }

    if (inputHosts && inputHosts.length > 0) {
      finalAttendees = this.replaceHostsWithUpdatedOnes(finalAttendees, inputHosts, existingEvent);
    }

    return finalAttendees;
  }

  private preserveExistingAttendees(existingEvent?: GoogleCalendarEventResponse | null): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    if (!existingEvent?.attendees) {
      return [];
    }

    return existingEvent.attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus || "needsAction",
      optional: attendee.optional,
      organizer: attendee.organizer,
    }));
  }

  private processAttendeeDeletions(
    attendees: Array<{
      email: string;
      displayName?: string;
      responseStatus: string;
      optional?: boolean;
      organizer?: boolean;
    }>,
    inputAttendees: UpdateCalendarEventAttendee[]
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    const attendeesToDelete = inputAttendees
      .filter((attendee) => attendee.action === "delete")
      .map((attendee) => attendee.email.toLowerCase());

    return attendees.filter((attendee) => !attendeesToDelete.includes(attendee.email.toLowerCase()));
  }

  private processAttendeeUpdatesAndAdditions(
    attendees: Array<{
      email: string;
      displayName?: string;
      responseStatus: string;
      optional?: boolean;
      organizer?: boolean;
    }>,
    inputAttendees: UpdateCalendarEventAttendee[]
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    const attendeesToUpdate = inputAttendees.filter((attendee) => attendee.action !== "delete");

    for (const userAttendee of attendeesToUpdate) {
      const existingIndex = attendees.findIndex(
        (attendee) => attendee.email.toLowerCase() === userAttendee.email.toLowerCase()
      );

      const transformedAttendee = {
        email: userAttendee.email,
        displayName: userAttendee.name,
        responseStatus: this.transformResponseStatus(userAttendee.responseStatus),
        optional: userAttendee.optional,
        organizer: false,
      };

      if (existingIndex >= 0) {
        attendees[existingIndex] = {
          ...transformedAttendee,
          organizer: attendees[existingIndex].organizer,
        };
      } else {
        attendees.push(transformedAttendee);
      }
    }

    return attendees;
  }

  private replaceHostsWithUpdatedOnes(
    attendees: Array<{
      email: string;
      displayName?: string;
      responseStatus: string;
      optional?: boolean;
      organizer?: boolean;
    }>,
    inputHosts: UpdateCalendarEventHost[],
    existingEvent?: GoogleCalendarEventResponse | null
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    const nonOrganizerAttendees = attendees.filter((attendee) => !attendee.organizer);

    const existingOrganizers = existingEvent?.attendees?.filter((attendee) => attendee.organizer) || [];

    if (!inputHosts || inputHosts.length === 0) {
      return attendees;
    }

    const updatedOrganizers = existingOrganizers.map((existingOrganizer) => ({
      email: existingOrganizer.email,
      displayName: existingOrganizer.displayName,
      responseStatus: this.transformResponseStatus(inputHosts[0]?.responseStatus),
      optional: existingOrganizer.optional || false,
      organizer: true,
    }));

    return [...nonOrganizerAttendees, ...updatedOrganizers];
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
