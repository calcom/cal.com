import { Injectable } from "@nestjs/common";
import {
  UpdateDateTimeWithZone,
  UpdateUnifiedCalendarEventInput,
} from "../inputs/update-unified-calendar-event.input";
import {
  CalendarEventResponseStatus,
  CalendarEventStatus,
} from "../outputs/get-unified-calendar-event.output";
import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";

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
  transform(updateData: UpdateUnifiedCalendarEventInput): any {
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

    if (updateData.attendees !== undefined) {
      updatePayload.attendees = this.transformAttendees(updateData.attendees);
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

  private transformAttendees(
    inputAttendees: NonNullable<UpdateUnifiedCalendarEventInput["attendees"]>
  ): GoogleCalendarAttendee[] {
    return inputAttendees.map((attendee) => {
      return {
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: this.transformResponseStatus(attendee.responseStatus),
        organizer: attendee.host,
        self: attendee.self,
        optional: attendee.optional,
      };
    });
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
