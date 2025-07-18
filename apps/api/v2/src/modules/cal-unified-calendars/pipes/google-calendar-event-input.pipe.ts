import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { PipeTransform, Injectable } from "@nestjs/common";

import {
  UpdateUnifiedCalendarEventInput,
  UpdateCalendarEventAttendee,
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
    inputHosts?: CalendarEventHost[],
    existingEvent?: GoogleCalendarEventResponse | null
  ): Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    organizer?: boolean;
  }> {
    let finalAttendees: Array<{
      email: string;
      displayName?: string;
      responseStatus: string;
      optional?: boolean;
      organizer?: boolean;
    }> = [];

    if (existingEvent?.attendees) {
      finalAttendees = existingEvent.attendees.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus || "needsAction",
        optional: attendee.optional,
        organizer: attendee.organizer,
      }));
    }

    if (inputAttendees) {
      const attendeesToDelete = inputAttendees
        .filter((attendee) => attendee.action === "delete")
        .map((attendee) => attendee.email.toLowerCase());

      finalAttendees = finalAttendees.filter(
        (attendee) => !attendeesToDelete.includes(attendee.email.toLowerCase())
      );

      const attendeesToUpdate = inputAttendees.filter((attendee) => attendee.action !== "delete");

      for (const userAttendee of attendeesToUpdate) {
        const existingIndex = finalAttendees.findIndex(
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
          finalAttendees[existingIndex] = {
            ...transformedAttendee,
            organizer: finalAttendees[existingIndex].organizer,
          };
        } else {
          finalAttendees.push(transformedAttendee);
        }
      }
    }

    if (inputHosts && inputHosts.length > 0) {
      finalAttendees = finalAttendees.filter((attendee) => !attendee.organizer);

      const transformedHosts = inputHosts.map((host) => ({
        email: host.email,
        displayName: host.name,
        responseStatus: this.transformResponseStatus(host.responseStatus),
        optional: false,
        organizer: true,
      }));

      finalAttendees.push(...transformedHosts);
    }

    return finalAttendees;
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
