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
    calendarEvent.summary = googleEvent.summary;
    calendarEvent.description = googleEvent.description || null;
    calendarEvent.location = googleEvent.location || null;

    calendarEvent.start = this.transformDateTimeWithZone(googleEvent.start);
    calendarEvent.end = this.transformDateTimeWithZone(googleEvent.end);

    calendarEvent.meetingUrl = googleEvent.hangoutLink || null;

    if (googleEvent.conferenceData) {
      calendarEvent.conferenceData = googleEvent.conferenceData;
    }

    if (googleEvent.attendees && googleEvent.attendees.length > 0) {
      calendarEvent.attendees = googleEvent.attendees.map((attendee) => {
        return {
          email: attendee.email,
          name: attendee.displayName,
          responseStatus: attendee.responseStatus,
          organizer: attendee.organizer,
          self: attendee.self,
        };
      });
    }

    calendarEvent.status = googleEvent.status || null;

    if (googleEvent.organizer) {
      calendarEvent.organizer = {
        email: googleEvent.organizer.email,
        name: googleEvent.organizer.displayName,
      };
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
