import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { PipeTransform, Injectable } from "@nestjs/common";

import {
  UpdateUnifiedCalendarEventInput,
  UpdateCalendarEventAttendee,
  UpdateCalendarEventHost,
  UpdateDateTimeWithZone,
} from "../inputs/update-unified-calendar-event.input";
import { CalendarEventResponseStatus, CalendarEventStatus } from "../outputs/get-unified-calendar-event";

// Common interfaces for Google Calendar types
interface GoogleCalendarDateTime {
  dateTime: string;
  timeZone: string;
}

interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus: string;
  organizer?: boolean;
}

interface GoogleCalendarEventInputTransform {
  transform(
    updateData: UpdateUnifiedCalendarEventInput,
    fetchedEvent?: GoogleCalendarEventResponse | null
  ): any;
}

@Injectable()
export class GoogleCalendarEventInputPipe implements GoogleCalendarEventInputTransform {
  transform(
    updateData: UpdateUnifiedCalendarEventInput,
    fetchedEvent?: GoogleCalendarEventResponse | null
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
        fetchedEvent
      );
    }

    if (updateData.status !== undefined) {
      updatePayload.status = this.transformEventStatus(updateData.status);
    }

    return updatePayload;
  }

  private transformDateTimeWithZone(dateTime: UpdateDateTimeWithZone): GoogleCalendarDateTime {
    return {
      dateTime: dateTime.time || "",
      timeZone: dateTime.timeZone || "",
    };
  }

  private transformAttendeesWithHostsHandling(
    inputAttendees?: UpdateUnifiedCalendarEventInput["attendees"],
    inputHosts?: UpdateUnifiedCalendarEventInput["hosts"],
    fetchedEvent?: GoogleCalendarEventResponse | null
  ): GoogleCalendarAttendee[] {
    let finalAttendees = this.preserveExistingAttendees(fetchedEvent);

    if (inputAttendees) {
      finalAttendees = this.processAttendeeDeletions(finalAttendees, inputAttendees);
      finalAttendees = this.processAttendeeUpdatesAndAdditions(finalAttendees, inputAttendees);
    }

    if (inputHosts && inputHosts.length > 0) {
      finalAttendees = this.replaceHostsWithUpdatedOnes(finalAttendees, inputHosts, fetchedEvent);
    }

    return finalAttendees;
  }

  private preserveExistingAttendees(
    fetchedEvent?: GoogleCalendarEventResponse | null
  ): GoogleCalendarAttendee[] {
    if (!fetchedEvent?.attendees) {
      return [];
    }

    return fetchedEvent.attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus || "needsAction",
    }));
  }

  private processAttendeeDeletions(
    attendees: GoogleCalendarAttendee[],
    inputAttendees: NonNullable<UpdateUnifiedCalendarEventInput["attendees"]>
  ): GoogleCalendarAttendee[] {
    const attendeesToDelete = inputAttendees
      .filter((attendee) => attendee.action === "delete")
      .map((attendee) => attendee.email.toLowerCase());

    return attendees.filter((attendee) => !attendeesToDelete.includes(attendee.email.toLowerCase()));
  }

  private processAttendeeUpdatesAndAdditions(
    attendees: GoogleCalendarAttendee[],
    inputAttendees: NonNullable<UpdateUnifiedCalendarEventInput["attendees"]>
  ): GoogleCalendarAttendee[] {
    const attendeesToUpdate = inputAttendees.filter((attendee) => attendee.action !== "delete");

    for (const userAttendee of attendeesToUpdate) {
      const existingIndex = attendees.findIndex(
        (attendee) => attendee.email.toLowerCase() === userAttendee.email.toLowerCase()
      );

      const transformedAttendee = {
        email: userAttendee.email,
        displayName: userAttendee.name,
        responseStatus: this.transformResponseStatus(userAttendee.responseStatus),
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
    attendees: GoogleCalendarAttendee[],
    inputHosts: NonNullable<UpdateUnifiedCalendarEventInput["hosts"]>,
    fetchedEvent?: GoogleCalendarEventResponse | null
  ): GoogleCalendarAttendee[] {
    const nonOrganizerAttendees = attendees.filter((attendee) => !attendee.organizer);

    const transformedHosts = inputHosts.map((host) => {
      const existingHost = fetchedEvent?.attendees?.find(
        (attendee) => attendee.organizer && attendee.email.toLowerCase() === host.email.toLowerCase()
      );

      return {
        email: existingHost?.email || host.email,
        displayName: existingHost?.displayName || host.email,
        responseStatus: this.transformResponseStatus(host.responseStatus),
        organizer: true,
      };
    });

    return [...nonOrganizerAttendees, ...transformedHosts];
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
