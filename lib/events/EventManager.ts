import { CalendarEvent, createEvent, updateEvent } from "@lib/calendarClient";
import { Credential } from "@prisma/client";
import async from "async";
import { createMeeting, updateMeeting } from "@lib/videoClient";
import prisma from "@lib/prisma";
import { LocationType } from "@lib/location";
import { v5 as uuidv5 } from "uuid";
import merge from "lodash.merge";
import EventAttendeeMail from "@lib/emails/EventAttendeeMail";

export interface EventResult {
  type: string;
  success: boolean;
  uid: string;
  createdEvent?: unknown;
  updatedEvent?: unknown;
  originalEvent: CalendarEvent;
}

export interface CreateUpdateResult {
  results: Array<EventResult>;
  referencesToCreate: Array<PartialReference>;
}

export interface PartialBooking {
  id: number;
  references: Array<PartialReference>;
}

export interface PartialReference {
  id?: number;
  type: string;
  uid: string;
}

interface GetLocationRequestFromIntegrationRequest {
  location: string;
}

export default class EventManager {
  calendarCredentials: Array<Credential>;
  videoCredentials: Array<Credential>;

  /**
   * Takes an array of credentials and initializes a new instance of the EventManager.
   *
   * @param credentials
   */
  constructor(credentials: Array<Credential>) {
    this.calendarCredentials = credentials.filter((cred) => cred.type.endsWith("_calendar"));
    this.videoCredentials = credentials.filter((cred) => cred.type.endsWith("_video"));
  }

  /**
   * Takes a CalendarEvent and creates all necessary integration entries for it.
   * When a video integration is chosen as the event's location, a video integration
   * event will be scheduled for it as well.
   * An optional uid can be set to override the auto-generated uid.
   *
   * @param event
   * @param maybeUid
   */
  public async create(event: CalendarEvent, maybeUid: string = null): Promise<CreateUpdateResult> {
    event = EventManager.processLocation(event);
    const isDedicated = EventManager.isDedicatedIntegration(event.location);

    // First, create all calendar events. If this is a dedicated integration event, don't send a mail right here.
    const results: Array<EventResult> = await this.createAllCalendarEvents(event, isDedicated, maybeUid);
    // If and only if event type is a dedicated meeting, create a dedicated video meeting as well.
    if (isDedicated) {
      results.push(await this.createVideoEvent(event, maybeUid));
    } else {
      if (!results.length || !results.some((eRes) => eRes.createdEvent.disableConfirmationEmail)) {
        const metadata: { hangoutLink?: string; conferenceData?: unknown; entryPoints?: unknown } = {};
        if (results.length) {
          // TODO: Handle created event metadata more elegantly
          metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
          metadata.conferenceData = results[0].createdEvent?.conferenceData;
          metadata.entryPoints = results[0].createdEvent?.entryPoints;
        }
        const attendeeMail = new EventAttendeeMail(event, maybeUid, metadata);
        try {
          await attendeeMail.sendEmail();
        } catch (e) {
          console.error("attendeeMail.sendEmail failed", e);
        }
      }
    }

    const referencesToCreate: Array<PartialReference> = results.map((result) => {
      return {
        type: result.type,
        uid: result.createdEvent.id.toString(),
      };
    });

    return {
      results,
      referencesToCreate,
    };
  }

  /**
   * Takes a calendarEvent and a rescheduleUid and updates the event that has the
   * given uid using the data delivered in the given CalendarEvent.
   *
   * @param event
   * @param rescheduleUid
   */
  public async update(event: CalendarEvent, rescheduleUid: string): Promise<CreateUpdateResult> {
    event = EventManager.processLocation(event);

    // Get details of existing booking.
    const booking = await prisma.booking.findFirst({
      where: {
        uid: rescheduleUid,
      },
      select: {
        id: true,
        references: {
          select: {
            id: true,
            type: true,
            uid: true,
          },
        },
      },
    });

    const isDedicated = EventManager.isDedicatedIntegration(event.location);

    // First, update all calendar events. If this is a dedicated event, don't send a mail right here.
    const results: Array<EventResult> = await this.updateAllCalendarEvents(event, booking, isDedicated);

    // If and only if event type is a dedicated meeting, update the dedicated video meeting as well.
    if (isDedicated) {
      results.push(await this.updateVideoEvent(event, booking));
    }

    // Now we can delete the old booking and its references.
    const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
      where: {
        bookingId: booking.id,
      },
    });
    const attendeeDeletes = prisma.attendee.deleteMany({
      where: {
        bookingId: booking.id,
      },
    });
    const bookingDeletes = prisma.booking.delete({
      where: {
        uid: rescheduleUid,
      },
    });

    // Wait for all deletions to be applied.
    await Promise.all([bookingReferenceDeletes, attendeeDeletes, bookingDeletes]);

    return {
      results,
      referencesToCreate: [...booking.references],
    };
  }

  /**
   * Creates event entries for all calendar integrations given in the credentials.
   * When noMail is true, no mails will be sent. This is used when the event is
   * a video meeting because then the mail containing the video credentials will be
   * more important than the mails created for these bare calendar events.
   *
   * When the optional uid is set, it will be used instead of the auto generated uid.
   *
   * @param event
   * @param noMail
   * @param maybeUid
   * @private
   */
  private createAllCalendarEvents(
    event: CalendarEvent,
    noMail: boolean,
    maybeUid: string = null
  ): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential: Credential) => {
      return createEvent(credential, event, noMail, maybeUid);
    });
  }

  /**
   * Checks which video integration is needed for the event's location and returns
   * credentials for that - if existing.
   * @param event
   * @private
   */
  private getVideoCredential(event: CalendarEvent): Credential | undefined {
    const integrationName = event.location.replace("integrations:", "");
    return this.videoCredentials.find((credential: Credential) => credential.type.includes(integrationName));
  }

  /**
   * Creates a video event entry for the selected integration location.
   *
   * When optional uid is set, it will be used instead of the auto generated uid.
   *
   * @param event
   * @param maybeUid
   * @private
   */
  private createVideoEvent(event: CalendarEvent, maybeUid: string = null): Promise<EventResult> {
    const credential = this.getVideoCredential(event);

    if (credential) {
      return createMeeting(credential, event, maybeUid);
    } else {
      return Promise.reject("No suitable credentials given for the requested integration name.");
    }
  }

  /**
   * Updates the event entries for all calendar integrations given in the credentials.
   * When noMail is true, no mails will be sent. This is used when the event is
   * a video meeting because then the mail containing the video credentials will be
   * more important than the mails created for these bare calendar events.
   *
   * @param event
   * @param booking
   * @param noMail
   * @private
   */
  private updateAllCalendarEvents(
    event: CalendarEvent,
    booking: PartialBooking,
    noMail: boolean
  ): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0]?.uid;
      return updateEvent(credential, bookingRefUid, event, noMail);
    });
  }

  /**
   * Updates a single video event.
   *
   * @param event
   * @param booking
   * @private
   */
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
   * Returns true if the given location describes a dedicated integration that
   * delivers meeting credentials. Zoom, for example, is dedicated, because it
   * needs to be called independently from any calendar APIs to receive meeting
   * credentials. Google Meetings, in contrast, are not dedicated, because they
   * are created while scheduling a regular calendar event by simply adding some
   * attributes to the payload JSON.
   *
   * @param location
   * @private
   */
  private static isDedicatedIntegration(location: string): boolean {
    // Hard-coded for now, because Zoom and Google Meet are both integrations, but one is dedicated, the other one isn't.
    return location === "integrations:zoom";
  }

  /**
   * Helper function for processLocation: Returns the conferenceData object to be merged
   * with the CalendarEvent.
   *
   * @param locationObj
   * @private
   */
  private static getLocationRequestFromIntegration(locationObj: GetLocationRequestFromIntegrationRequest) {
    const location = locationObj.location;

    if (location === LocationType.GoogleMeet.valueOf() || location === LocationType.Zoom.valueOf()) {
      const requestId = uuidv5(location, uuidv5.URL);

      return {
        conferenceData: {
          createRequest: {
            requestId: requestId,
          },
        },
        location,
      };
    }

    return null;
  }

  /**
   * Takes a CalendarEvent and adds a ConferenceData object to the event
   * if the event has an integration-related location.
   *
   * @param event
   * @private
   */
  private static processLocation(event: CalendarEvent): CalendarEvent {
    // If location is set to an integration location
    // Build proper transforms for evt object
    // Extend evt object with those transformations
    if (event.location?.includes("integration")) {
      const maybeLocationRequestObject = EventManager.getLocationRequestFromIntegration({
        location: event.location,
      });

      event = merge(event, maybeLocationRequestObject);
    }

    return event;
  }
}
