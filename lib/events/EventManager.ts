import { CalendarEvent, createEvent, updateEvent } from "@lib/calendarClient";
import { Credential } from "@prisma/client";
import async from "async";
import { createMeeting, updateMeeting } from "@lib/videoClient";
import prisma from "@lib/prisma";

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
   *
   * @param event
   */
  public async create(event: CalendarEvent): Promise<CreateUpdateResult> {
    const isVideo = EventManager.isIntegration(event.location);

    // First, create all calendar events. If this is a video event, don't send a mail right here.
    const results: Array<EventResult> = await this.createAllCalendarEvents(event, isVideo);

    // If and only if event type is a video meeting, create a video meeting as well.
    if (isVideo) {
      results.push(await this.createVideoEvent(event));
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

    const isVideo = EventManager.isIntegration(event.location);

    // First, update all calendar events. If this is a video event, don't send a mail right here.
    const results: Array<EventResult> = await this.updateAllCalendarEvents(event, booking, isVideo);

    // If and only if event type is a video meeting, update the video meeting as well.
    if (isVideo) {
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
   * @param event
   * @param noMail
   * @private
   */
  private createAllCalendarEvents(event: CalendarEvent, noMail: boolean): Promise<Array<EventResult>> {
    return async.mapLimit(this.calendarCredentials, 5, async (credential: Credential) => {
      return createEvent(credential, event, noMail);
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
   * Returns true if the given location describes an integration that delivers meeting credentials.
   *
   * @param location
   * @private
   */
  private static isIntegration(location: string): boolean {
    return location.includes("integrations:");
  }
}
