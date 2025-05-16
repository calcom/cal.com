import { CalendarEventOutput, DateTimeWithZone } from "@/ee/calendars/outputs/get-calendar-event";
import { GoogleCalendarEventResponse } from "@/ee/calendars/services/gcal.service";
import { PipeTransform, Injectable } from "@nestjs/common";

@Injectable()
export class GoogleCalendarEventOutputPipe
  implements PipeTransform<GoogleCalendarEventResponse, CalendarEventOutput>
{
  transform(googleEvent: GoogleCalendarEventResponse): CalendarEventOutput {
    const calendarEvent = new CalendarEventOutput();

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
