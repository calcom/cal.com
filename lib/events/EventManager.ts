import { Credential } from "@prisma/client";
import async from "async";
import merge from "lodash.merge";
import { v5 as uuidv5 } from "uuid";

import { CalendarEvent, createEvent, updateEvent } from "@lib/calendarClient";
import EventAttendeeMail from "@lib/emails/EventAttendeeMail";
import EventAttendeeRescheduledMail from "@lib/emails/EventAttendeeRescheduledMail";
import { LocationType } from "@lib/location";
import prisma from "@lib/prisma";
import { createMeeting, updateMeeting, VideoCallData } from "@lib/videoClient";

export interface EventResult {
  type: string;
  success: boolean;
  uid: string;
  createdEvent?: unknown;
  updatedEvent?: unknown;
  originalEvent: CalendarEvent;
  videoCallData?: VideoCallData;
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
  meetingId?: string;
  meetingPassword?: string;
  meetingUrl?: string;
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
  public async create(event: CalendarEvent, maybeUid?: string): Promise<CreateUpdateResult> {
    event = EventManager.processLocation(event);
    const isDedicated = EventManager.isDedicatedIntegration(event.location);

    let results: Array<EventResult> = [];
    let optionalVideoCallData: VideoCallData | undefined = undefined;

    // If and only if event type is a dedicated meeting, create a dedicated video meeting.
    if (isDedicated) {
      const result = await this.createVideoEvent(event, maybeUid);
      if (result.videoCallData) {
        optionalVideoCallData = result.videoCallData;
      }
      results.push(result);
    } else {
      await EventManager.sendAttendeeMail("new", results, event, maybeUid);
    }

    // Now create all calendar events. If this is a dedicated integration event,
    // don't send a mail right here, because it has already been sent.
    results = results.concat(
      await this.createAllCalendarEvents(event, isDedicated, maybeUid, optionalVideoCallData)
    );

    const referencesToCreate: Array<PartialReference> = results.map((result: EventResult) => {
      return {
        type: result.type,
        uid: result.createdEvent.id.toString(),
        meetingId: result.videoCallData?.id.toString(),
        meetingPassword: result.videoCallData?.password,
        meetingUrl: result.videoCallData?.url,
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
            meetingId: true,
            meetingPassword: true,
            meetingUrl: true,
          },
        },
      },
    });

    const isDedicated = EventManager.isDedicatedIntegration(event.location);

    let results: Array<EventResult> = [];
    let optionalVideoCallData: VideoCallData | undefined = undefined;

    // If and only if event type is a dedicated meeting, update the dedicated video meeting.
    if (isDedicated) {
      const result = await this.updateVideoEvent(event, booking);
      if (result.videoCallData) {
        optionalVideoCallData = result.videoCallData;
      }
      results.push(result);
    } else {
      await EventManager.sendAttendeeMail("reschedule", results, event, rescheduleUid);
    }

    // Now update all calendar events. If this is a dedicated integration event,
    // don't send a mail right here, because it has already been sent.
    results = results.concat(
      await this.updateAllCalendarEvents(event, booking, isDedicated, optionalVideoCallData)
    );

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
   * @param optionalVideoCallData
   * @private
   */
  private createAllCalendarEvents(
    event: CalendarEvent,
    noMail: boolean,
    maybeUid?: string,
    optionalVideoCallData?: VideoCallData
  ): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential: Credential) => {
      return createEvent(credential, event, noMail, maybeUid, optionalVideoCallData);
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
  private createVideoEvent(event: CalendarEvent, maybeUid?: string): Promise<EventResult> {
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
    noMail: boolean,
    optionalVideoCallData?: VideoCallData
  ): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0]?.uid;
      return updateEvent(credential, bookingRefUid, event, noMail, optionalVideoCallData);
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
      const bookingRef = booking.references.filter((ref) => ref.type === credential.type)[0];

      return updateMeeting(credential, bookingRef.uid, event).then((returnVal: EventResult) => {
        // Some video integrations, such as Zoom, don't return any data about the booking when updating it.
        if (returnVal.videoCallData == undefined) {
          returnVal.videoCallData = EventManager.bookingReferenceToVideoCallData(bookingRef);
        }
        return returnVal;
      });
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

  /**
   * Accepts a PartialReference object and, if all data is complete,
   * returns a VideoCallData object containing the meeting information.
   *
   * @param reference
   * @private
   */
  private static bookingReferenceToVideoCallData(reference: PartialReference): VideoCallData | undefined {
    let isComplete = true;

    switch (reference.type) {
      case "zoom_video":
        // Zoom meetings in our system should always have an ID, a password and a join URL. In the
        // future, it might happen that we consider making passwords for Zoom meetings optional.
        // Then, this part below (where the password existence is checked) needs to be adapted.
        isComplete =
          reference.meetingId != undefined &&
          reference.meetingPassword != undefined &&
          reference.meetingUrl != undefined;
        break;
      default:
        isComplete = true;
    }

    if (isComplete) {
      return {
        type: reference.type,
        // The null coalescing operator should actually never be used here, because we checked if it's defined beforehand.
        id: reference.meetingId ?? "",
        password: reference.meetingPassword ?? "",
        url: reference.meetingUrl ?? "",
      };
    } else {
      return undefined;
    }
  }

  /**
   * Conditionally sends an email to the attendee.
   *
   * @param type
   * @param results
   * @param event
   * @param maybeUid
   * @private
   */
  private static async sendAttendeeMail(
    type: "new" | "reschedule",
    results: Array<EventResult>,
    event: CalendarEvent,
    maybeUid?: string
  ) {
    if (
      !results.length ||
      !results.some((eRes) => (eRes.createdEvent || eRes.updatedEvent).disableConfirmationEmail)
    ) {
      const metadata: { hangoutLink?: string; conferenceData?: unknown; entryPoints?: unknown } = {};
      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
      }
      let attendeeMail;
      switch (type) {
        case "reschedule":
          attendeeMail = new EventAttendeeRescheduledMail(event, maybeUid, metadata);
          break;
        case "new":
          attendeeMail = new EventAttendeeMail(event, maybeUid, metadata);
          break;
      }
      try {
        await attendeeMail.sendEmail();
      } catch (e) {
        console.error("attendeeMail.sendEmail failed", e);
      }
    }
  }
}
