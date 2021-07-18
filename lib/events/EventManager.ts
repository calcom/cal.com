import { CalendarEvent, createEvent, updateEvent } from "@lib/calendarClient";
import { Credential } from "@prisma/client";
import async from "async";
import { createMeeting, updateMeeting } from "@lib/videoClient";

export interface EventResult {
  type: string;
  success: boolean;
  uid: string;
  createdEvent?: unknown;
  updatedEvent?: unknown;
  originalEvent: CalendarEvent;
}

export interface PartialBooking {
  id: number;
  references: Array<PartialReference>;
}

export interface PartialReference {
  id: number;
  type: string;
  uid: string;
}

export default class EventManager {
  calendarCredentials: Array<Credential>;
  videoCredentials: Array<Credential>;

  constructor(credentials: Array<Credential>) {
    this.calendarCredentials = credentials.filter((cred) => cred.type.endsWith("_calendar"));
    this.videoCredentials = credentials.filter((cred) => cred.type.endsWith("_video"));
  }

  public async create(event: CalendarEvent): Promise<Array<EventResult>> {
    // First, create all calendar events.
    const results: Array<EventResult> = await this.createAllCalendarEvents(event);

    // If and only if event type is a video meeting, create a video meeting as well.
    if (EventManager.isIntegration(event.location)) {
      results.push(await this.createVideoEvent(event));
    }

    return results;
  }

  public async update(event: CalendarEvent, booking: PartialBooking): Promise<Array<EventResult>> {
    // First, update all calendar events.
    const results: Array<EventResult> = await this.updateAllCalendarEvents(event, booking);

    // If and only if event type is a video meeting, update the video meeting as well.
    if (EventManager.isIntegration(event.location)) {
      results.push(await this.updateVideoEvent(event, booking));
    }

    return results;
  }

  /**
   * Creates event entries for all calendar integrations given in the credentials.
   *
   * @param event
   * @private
   */
  private createAllCalendarEvents(event: CalendarEvent): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential: Credential) => {
      return createEvent(credential, event);
    });
  }

  private getVideoCredential(event: CalendarEvent): Credential | undefined {
    const integrationName = event.location.replace("integrations:", "");
    return this.videoCredentials.find((credential: Credential) => credential.type.includes(integrationName));
  }

  /**
   * Creates a video event entry for the selected integration location.
   *
   * @param event
   * @private
   */
  private createVideoEvent(event: CalendarEvent): Promise<EventResult> {
    const credential = this.getVideoCredential(event);

    if (credential) {
      return createMeeting(credential, event);
    } else {
      return Promise.reject("No suitable credentials given for the requested integration name.");
    }
  }

  private updateAllCalendarEvents(
    event: CalendarEvent,
    booking: PartialBooking
  ): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0]?.uid;
      return updateEvent(credential, bookingRefUid, event);
    });
  }

  private updateVideoEvent(event: CalendarEvent, booking: PartialBooking) {
    const credential = this.getVideoCredential(event);

    if (credential) {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      return updateMeeting(credential, bookingRefUid, event);
    } else {
      return Promise.reject("No suitable credentials given for the requested integration name.");
    }
  }

  /**
   * Returns true if the given location describes an integration that delivers meeting credentials.
   *
   * @param location
   * @private
   */
  private static isIntegration(location: string): boolean {
    return location.includes("integrations:");
  }
}
