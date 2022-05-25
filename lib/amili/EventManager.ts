import { CalendarEvent } from "@lib/calendarClient";
import { Credential } from "@prisma/client";
import { getLocationRequestFromIntegration } from "pages/api/book/[user]";
import _merge from "lodash.merge";
import { createMeeting } from "@lib/videoClient";
import { createEvent } from "./calendarService";

export const isZoom = (location: string): boolean => {
  return location === "integrations:zoom";
};

export const isDaily = (location: string): boolean => {
  return location === "integrations:daily";
};

export const isHuddle01 = (location: string): boolean => {
  return location === "integrations:huddle01";
};

export const isTandem = (location: string): boolean => {
  return location === "integrations:tandem";
};

export const isTeams = (location: string): boolean => {
  return location === "integrations:office365_video";
};

export const isJitsi = (location: string): boolean => {
  return location === "integrations:jitsi";
};

export const isDedicatedIntegration = (location: string): boolean => {
  return (
    isZoom(location) ||
    isDaily(location) ||
    isHuddle01(location) ||
    isTandem(location) ||
    isJitsi(location) ||
    isTeams(location)
  );
};

export const processLocation = (event: CalendarEvent): CalendarEvent => {
  // If location is set to an integration location
  // Build proper transforms for evt object
  // Extend evt object with those transformations
  if (event.location?.includes("integration")) {
    const maybeLocationRequestObject = getLocationRequestFromIntegration({ location: event.location });

    event = _merge(event, maybeLocationRequestObject);
  }

  return event;
};

type EventManagerUser = {
  credentials: Credential[];
  destinationCalendar: any;
};

export default class EventManager {
  calendarCredentials: Credential[];
  videoCredentials: Credential[];

  /**
   * Takes an array of credentials and initializes a new instance of the EventManager.
   *
   * @param user
   */
  constructor(evt: EventManagerUser) {
    const appCredentials = evt.credentials;
    this.calendarCredentials = appCredentials.filter((cred) => cred.type.endsWith("_calendar"));
    this.videoCredentials = appCredentials.filter((cred) => cred.type.endsWith("_video"));
  }

  /**
   * Checks which video integration is needed for the event's location and returns
   * credentials for that - if existing.
   * @param event
   * @private
   */

  private getVideoCredential(event: CalendarEvent): Credential | undefined {
    if (!event.location) {
      return undefined;
    }

    const integrationName = event.location.replace("integrations:", "");

    return this.videoCredentials.find((credential: Credential) => credential.type.includes(integrationName));
  }

  /**
   * Creates a video event entry for the selected integration location.
   *
   * When optional uid is set, it will be used instead of the auto generated uid.
   *
   * @param event
   * @private
   */
  private createVideoEvent(event: CalendarEvent): Promise<any> {
    const credential = this.getVideoCredential(event);

    if (credential) {
      return createMeeting(credential, event);
    } else {
      return Promise.reject(
        `No suitable credentials given for the requested integration name:${event.location}`
      );
    }
  }

  private async createAllCalendarEvents(event: CalendarEvent): Promise<Array<any>> {
    /** Can I use destinationCalendar here? */
    /* How can I link a DC to a cred? */
    if (event.destinationCalendar) {
      const destinationCalendarCredentials = this.calendarCredentials.filter(
        (c) => c.type === event.destinationCalendar?.integration
      );
      return Promise.all(destinationCalendarCredentials.map(async (c) => await createEvent(c, event)));
    }

    /**
     *  Not ideal but, if we don't find a destination calendar,
     * fallback to the first connected calendar
     */
    const [credential] = this.calendarCredentials;
    if (!credential) {
      return [];
    }
    return [await createEvent(credential, event)];
  }

  /**
   * Takes a CalendarEvent and creates all necessary integration entries for it.
   * When a video integration is chosen as the event's location, a video integration
   * event will be scheduled for it as well.
   *
   * @param event
   */

  public async create(event: CalendarEvent): Promise<any> {
    const evt = processLocation(event);
    const isDedicated = evt.location ? isDedicatedIntegration(evt.location) : null;

    const results = [] as any;

    // If and only if event type is a dedicated meeting, create a dedicated video meeting.
    if (isDedicated) {
      const result = await this.createVideoEvent(evt);
      if (result.createdEvent) {
        evt.videoCallData = result.createdEvent;
      }

      results.push(result);
    }

    // Create the calendar event with the proper video call data
    results.push(...(await this.createAllCalendarEvents(evt)));

    const referencesToCreate = results.map((result) => {
      return {
        type: result.type,
        uid: result.createdEvent?.id.toString() ?? "",
        meetingId: result.createdEvent?.id.toString(),
        meetingPassword: result.createdEvent?.password,
        meetingUrl: result.createdEvent?.url,
      };
    });

    return {
      results,
      referencesToCreate,
    };
  }

  // public async update(event: CalendarEvent, rescheduleUid: string, newBookingId?: number): Promise<any> {
  //   return null;
  // }
}
