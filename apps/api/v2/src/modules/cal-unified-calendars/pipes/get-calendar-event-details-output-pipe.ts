import {
  DateTimeWithZone,
  UnifiedCalendarEventOutput,
} from "@/modules/cal-unified-calendars/outputs/get-unified-calendar-event";
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

    if (googleEvent?.conferenceData?.entryPoints) {
      calendarEvent.locations = googleEvent.conferenceData.entryPoints.map((entryPoint) => {
        return {
          type: entryPoint.entryPointType,
          ...entryPoint,
        };
      });
    } else if (googleEvent.hangoutLink) {
      calendarEvent.locations = [{ type: "video", uri: googleEvent.hangoutLink }];
    }

    if (googleEvent.attendees && googleEvent.attendees.length > 0) {
      calendarEvent.attendees = googleEvent.attendees
        .filter((attendee) => !attendee.organizer)
        .map((attendee) => {
          return {
            email: attendee.email,
            name: attendee.displayName,
            responseStatus: attendee.responseStatus,
            organizer: attendee.organizer,
            self: attendee.self,
            optional: attendee.optional,
          };
        });
    }

    calendarEvent.status = googleEvent.status || null;

    if (googleEvent.organizer) {
      calendarEvent.organizer = {
        email: googleEvent.organizer.email,
        name: googleEvent.organizer.displayName,
      };
    } else if (googleEvent.attendees) {
      // If no explicit organizer, find the first attendee with organizer flag
      const organizerAttendee = googleEvent.attendees.find((attendee) => attendee.organizer);
      if (organizerAttendee) {
        calendarEvent.organizer = {
          email: organizerAttendee.email,
          name: organizerAttendee.displayName,
        };
      }
    }

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
}
