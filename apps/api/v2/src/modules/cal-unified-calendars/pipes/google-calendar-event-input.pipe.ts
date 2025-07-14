import { PipeTransform, Injectable } from "@nestjs/common";

import { UpdateUnifiedCalendarEventInput } from "../inputs/update-unified-calendar-event.input";

@Injectable()
export class GoogleCalendarEventInputPipe implements PipeTransform<UpdateUnifiedCalendarEventInput, any> {
  transform(updateData: UpdateUnifiedCalendarEventInput): any {
    const updatePayload: any = {};

    if (updateData.title !== undefined) {
      updatePayload.summary = updateData.title;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    if (updateData.start) {
      updatePayload.start = {
        dateTime: updateData.start.time,
        timeZone: updateData.start.timeZone,
      };
    }

    if (updateData.end) {
      updatePayload.end = {
        dateTime: updateData.end.time,
        timeZone: updateData.end.timeZone,
      };
    }

    if (updateData.attendees !== undefined) {
      updatePayload.attendees = updateData.attendees.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.name,
        responseStatus: this.mapResponseStatusToGoogle(attendee.responseStatus),
        optional: attendee.optional,
      }));
    }

    if (updateData.locations !== undefined) {
      const nonVideoLocations = updateData.locations.filter((loc) => loc.type !== "video");
      if (nonVideoLocations.length > 0) {
        updatePayload.location = nonVideoLocations[0].url || nonVideoLocations[0].label;
      }

      const videoLocation = updateData.locations.find((loc) => loc.type === "video");
      if (videoLocation) {
        updatePayload.conferenceData = {
          entryPoints: updateData.locations.map((location) => ({
            entryPointType: location.type,
            uri: location.url,
            label: location.label,
            pin: (location as any).pin,
            regionCode: (location as any).regionCode,
          })),
        };
      }
    }

    if (updateData.status !== undefined) {
      updatePayload.status = this.mapEventStatusToGoogle(updateData.status);
    }

    return updatePayload;
  }

  private mapResponseStatusToGoogle(responseStatus?: string | null): string {
    if (!responseStatus) return "needsAction";

    switch (responseStatus.toLowerCase()) {
      case "accepted":
        return "accepted";
      case "pending":
        return "tentative";
      case "declined":
        return "declined";
      case "needsaction":
        return "needsAction";
      default:
        return "needsAction";
    }
  }

  private mapEventStatusToGoogle(status?: string | null): string {
    if (!status) return "confirmed";

    switch (status.toLowerCase()) {
      case "accepted":
        return "confirmed";
      case "pending":
        return "tentative";
      case "cancelled":
        return "cancelled";
      case "declined":
        return "cancelled";
      default:
        return "confirmed";
    }
  }
}
