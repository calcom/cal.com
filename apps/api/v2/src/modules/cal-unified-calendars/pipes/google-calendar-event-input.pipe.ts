import { GoogleCalendarEventResponse } from "@/modules/cal-unified-calendars/pipes/get-calendar-event-details-output-pipe";
import { PipeTransform, Injectable } from "@nestjs/common";

import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";
import { UpdateDateTimeWithZone } from "../inputs/update-unified-calendar-event.input";
import { CalendarEventResponseStatus, CalendarEventStatus } from "../outputs/get-unified-calendar-event";

@Injectable()
export class GoogleCalendarEventInputPipe
  implements PipeTransform<UpdateUnifiedCalendarEventInput, GoogleCalendarEventResponse>
{
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

    if (updateData.hosts !== undefined) {
      // Google doesn't directly support setting hosts via API
      // We could potentially handle this if needed
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
