import {
  CalendarEventResponseStatus,
  CalendarEventStatus,
  DateTimeWithZone,
  UnifiedCalendarEventOutput,
} from "@/modules/cal-unified-calendars/outputs/get-unified-calendar-event.output";
import { PipeTransform, Injectable } from "@nestjs/common";

export interface GoogleCalendarEventResponse {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  iCalUID: string;
  sequence: number;
  attendees?: Array<{
    email: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    responseStatus?: string;
    optional?: boolean;
  }>;
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status: {
        statusCode: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
      pin?: string;
      regionCode?: string;
    }>;
    conferenceSolution?: {
      key: {
        type: string;
      };
      name: string;
      iconUri: string;
    };
    conferenceId: string;
  };
  reminders?: {
    useDefault: boolean;
  };
  eventType?: string;
}

@Injectable()
export class GoogleCalendarEventOutputPipe
  implements PipeTransform<GoogleCalendarEventResponse, UnifiedCalendarEventOutput>
{
  transform(googleEvent: GoogleCalendarEventResponse): UnifiedCalendarEventOutput {
    const calendarEvent = new UnifiedCalendarEventOutput();

    calendarEvent.id = googleEvent.id;
    calendarEvent.title = googleEvent.summary;
    calendarEvent.description = googleEvent.description || null;

    calendarEvent.start = this.transformDateTimeWithZone(googleEvent.start);
    calendarEvent.end = this.transformDateTimeWithZone(googleEvent.end);

    calendarEvent.locations = this.transformLocations(googleEvent);

    if (googleEvent.attendees && googleEvent.attendees.length > 0) {
      calendarEvent.attendees = googleEvent.attendees.map((attendee) => {
        return {
          email: attendee.email,
          name: attendee.displayName,
          responseStatus: this.transformAttendeeResponseStatus(attendee.responseStatus),
          host: attendee.organizer,
          self: attendee.self,
          optional: attendee.optional,
        };
      });
    }

    calendarEvent.status = this.transformEventStatus(googleEvent.status);

    calendarEvent.calendarEventOwner = googleEvent.organizer;
    calendarEvent.hosts = this.transformHosts(googleEvent);

    calendarEvent.source = "google";

    return calendarEvent;
  }

  private transformDateTimeWithZone(googleDateTime: {
    dateTime: string;
    timeZone: string;
  }): DateTimeWithZone {
    const dateTimeWithZone = new DateTimeWithZone();
    dateTimeWithZone.time = googleDateTime.dateTime;
    dateTimeWithZone.timeZone = googleDateTime.timeZone;
    return dateTimeWithZone;
  }

  private transformAttendeeResponseStatus(responseStatus?: string): CalendarEventResponseStatus | null {
    if (!responseStatus) return null;

    switch (responseStatus.toLowerCase()) {
      case "accepted":
        return CalendarEventResponseStatus.ACCEPTED;
      case "tentative":
        return CalendarEventResponseStatus.PENDING;
      case "declined":
        return CalendarEventResponseStatus.DECLINED;
      case "needsaction":
        return CalendarEventResponseStatus.NEEDS_ACTION;
      default:
        return null;
    }
  }

  private transformEventStatus(eventStatus?: string): CalendarEventStatus | null {
    if (!eventStatus) return null;

    switch (eventStatus.toLowerCase()) {
      case "confirmed":
        return CalendarEventStatus.ACCEPTED;
      case "tentative":
        return CalendarEventStatus.PENDING;
      case "cancelled":
        return CalendarEventStatus.CANCELLED;
      default:
        return null;
    }
  }

  private transformHosts(googleEvent: GoogleCalendarEventResponse) {
    const hosts: Array<{ email: string; name?: string; responseStatus: CalendarEventResponseStatus | null }> =
      [];

    const organizerAttendees = googleEvent?.attendees?.filter((attendee) => attendee.organizer);
    if (organizerAttendees?.length) {
      organizerAttendees.forEach((organizer) => {
        hosts.push({
          email: organizer.email,
          name: organizer.displayName,
          responseStatus: this.transformAttendeeResponseStatus(organizer.responseStatus),
        });
      });
    } else {
      hosts.push({
        email: googleEvent.organizer.email,
        name: googleEvent.organizer.displayName,
        responseStatus: null,
      });
    }

    return hosts;
  }

  private transformLocations(
    googleEvent: GoogleCalendarEventResponse
  ): Array<{ type: string; url: string; label?: string; pin?: string; regionCode?: string }> {
    if (googleEvent?.conferenceData?.entryPoints) {
      return googleEvent.conferenceData.entryPoints.map((entryPoint) => {
        return {
          type: entryPoint.entryPointType,
          url: entryPoint.uri,
          label: entryPoint.label,
          pin: entryPoint.pin,
          regionCode: entryPoint.regionCode,
        };
      });
    } else if (googleEvent.location) {
      return [{ type: "video", url: googleEvent.location }];
    } else if (googleEvent.hangoutLink) {
      return [{ type: "video", url: googleEvent.hangoutLink }];
    }

    return [];
  }
}
