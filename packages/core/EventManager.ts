import type { DestinationCalendar } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep, merge } from "lodash";
import { v5 as uuidv5 } from "uuid";
import type { z } from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { appKeysSchema as calVideoKeysSchema } from "@calcom/app-store/dailyvideo/zod";
import { getEventLocationTypeFromApp, MeetLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import logger from "@calcom/lib/logger";
import {
  getPiiFreeDestinationCalendar,
  getPiiFreeUser,
  getPiiFreeCredential,
  getPiiFreeCalendarEvent,
} from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { createdEventSchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent, NewCalendarEventType } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { Event } from "@calcom/types/Event";
import type {
  CreateUpdateResult,
  EventResult,
  PartialBooking,
  PartialReference,
} from "@calcom/types/EventManager";

import { createEvent, updateEvent, deleteEvent } from "./CalendarManager";
import { createMeeting, updateMeeting, deleteMeeting } from "./videoClient";

const log = logger.getSubLogger({ prefix: ["EventManager"] });
export const isDedicatedIntegration = (location: string): boolean => {
  return location !== MeetLocationType && location.includes("integrations:");
};

export const getLocationRequestFromIntegration = (location: string) => {
  const eventLocationType = getEventLocationTypeFromApp(location);
  if (eventLocationType) {
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
};

export const processLocation = (event: CalendarEvent): CalendarEvent => {
  // If location is set to an integration location
  // Build proper transforms for evt object
  // Extend evt object with those transformations

  // TODO: Rely on linkType:"dynamic" here. static links don't send their type. They send their URL directly.
  if (event.location?.includes("integration")) {
    const maybeLocationRequestObject = getLocationRequestFromIntegration(event.location);

    event = merge(event, maybeLocationRequestObject);
  }

  return event;
};

export type EventManagerUser = {
  credentials: CredentialPayload[];
  destinationCalendar: DestinationCalendar | null;
};

type createdEventSchema = z.infer<typeof createdEventSchema>;

export default class EventManager {
  calendarCredentials: CredentialPayload[];
  videoCredentials: CredentialPayload[];

  /**
   * Takes an array of credentials and initializes a new instance of the EventManager.
   *
   * @param user
   */
  constructor(user: EventManagerUser) {
    log.silly("Initializing EventManager", safeStringify({ user: getPiiFreeUser(user) }));
    const appCredentials = getApps(user.credentials, true).flatMap((app) =>
      app.credentials.map((creds) => ({ ...creds, appName: app.name }))
    );
    // This includes all calendar-related apps, traditional calendars such as Google Calendar
    // (type google_calendar) and non-traditional calendars such as CRMs like Close.com
    // (type closecom_other_calendar)
    this.calendarCredentials = appCredentials.filter((cred) => cred.type.endsWith("_calendar"));
    this.videoCredentials = appCredentials
      .filter((cred) => cred.type.endsWith("_video") || cred.type.endsWith("_conferencing"))
      // Whenever a new video connection is added, latest credentials are added with the highest ID.
      // Because you can't rely on having them in the highest first order here, ensure this by sorting in DESC order
      // We also don't have updatedAt or createdAt dates on credentials so this is the best we can do
      .sort((a, b) => {
        return b.id - a.id;
      });
  }

  /**
   * Takes a CalendarEvent and creates all necessary integration entries for it.
   * When a video integration is chosen as the event's location, a video integration
   * event will be scheduled for it as well.
   *
   * @param event
   */
  public async create(event: CalendarEvent): Promise<CreateUpdateResult> {
    const evt = processLocation(event);
    // Fallback to cal video if no location is set
    if (!evt.location) {
      // See if cal video is enabled & has keys
      const calVideo = await prisma.app.findFirst({
        where: {
          slug: "daily-video",
        },
        select: {
          keys: true,
          enabled: true,
        },
      });

      const calVideoKeys = calVideoKeysSchema.safeParse(calVideo?.keys);

      if (calVideo?.enabled && calVideoKeys.success) evt["location"] = "integrations:daily";
    }

    // Fallback to Cal Video if Google Meet is selected w/o a Google Cal
    // @NOTE: destinationCalendar it's an array now so as a fallback we will only check the first one
    const [mainHostDestinationCalendar] =
      (evt.destinationCalendar as [undefined | NonNullable<typeof evt.destinationCalendar>[number]]) ?? [];
    if (evt.location === MeetLocationType && mainHostDestinationCalendar?.integration !== "google_calendar") {
      log.warn("Falling back to Cal Video integration as Google Calendar not installed");
      evt["location"] = "integrations:daily";
    }
    const isDedicated = evt.location ? isDedicatedIntegration(evt.location) : null;

    const results: Array<EventResult<Exclude<Event, AdditionalInformation>>> = [];

    // If and only if event type is a dedicated meeting, create a dedicated video meeting.
    if (isDedicated) {
      const result = await this.createVideoEvent(evt);

      if (result?.createdEvent) {
        evt.videoCallData = result.createdEvent;
        evt.location = result.originalEvent.location;
        result.type = result.createdEvent.type;
      }

      results.push(result);
    }

    // Some calendar libraries may edit the original event so let's clone it
    const clonedCalEvent = cloneDeep(event);
    // Create the calendar event with the proper video call data
    results.push(...(await this.createAllCalendarEvents(clonedCalEvent)));

    // Since the result can be a new calendar event or video event, we have to create a type guard
    // https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
    const isCalendarResult = (
      result: (typeof results)[number]
    ): result is EventResult<NewCalendarEventType> => {
      return result.type.includes("_calendar");
    };

    // References can be any type: calendar/video
    const referencesToCreate = results.map((result) => {
      let createdEventObj: createdEventSchema | null = null;
      if (typeof result?.createdEvent === "string") {
        createdEventObj = createdEventSchema.parse(JSON.parse(result.createdEvent));
      }
      const isCalendarType = isCalendarResult(result);
      if (isCalendarType) {
        evt.iCalUID = result.iCalUID || event.iCalUID || undefined;
      }

      return {
        type: result.type,
        uid: createdEventObj ? createdEventObj.id : result.createdEvent?.id?.toString() ?? "",
        meetingId: createdEventObj ? createdEventObj.id : result.createdEvent?.id?.toString(),
        meetingPassword: createdEventObj ? createdEventObj.password : result.createdEvent?.password,
        meetingUrl: createdEventObj ? createdEventObj.onlineMeetingUrl : result.createdEvent?.url,
        externalCalendarId: isCalendarType ? result.externalId : undefined,
        credentialId: isCalendarType ? result.credentialId : undefined,
      };
    });

    return {
      results,
      referencesToCreate,
    };
  }

  public async updateLocation(event: CalendarEvent, booking: PartialBooking): Promise<CreateUpdateResult> {
    const evt = processLocation(event);
    const isDedicated = evt.location ? isDedicatedIntegration(evt.location) : null;

    const results: Array<EventResult<Exclude<Event, AdditionalInformation>>> = [];
    // If and only if event type is a dedicated meeting, create a dedicated video meeting.
    if (isDedicated) {
      const result = await this.createVideoEvent(evt);
      if (result.createdEvent) {
        evt.videoCallData = result.createdEvent;
      }

      results.push(result);
    }

    // Update the calendar event with the proper video call data
    const calendarReference = booking.references.find((reference) => reference.type.includes("_calendar"));
    if (calendarReference) {
      results.push(...(await this.updateAllCalendarEvents(evt, booking)));
    }

    const referencesToCreate = results.map((result) => {
      return {
        type: result.type,
        uid: result.createdEvent?.id?.toString() ?? "",
        meetingId: result.createdEvent?.id?.toString(),
        meetingPassword: result.createdEvent?.password,
        meetingUrl: result.createdEvent?.url,
        externalCalendarId: result.externalId,
        credentialId: result.credentialId ?? undefined,
      };
    });

    return {
      results,
      referencesToCreate,
    };
  }

  private async deleteCalendarEventForBookingReference({
    bookingCalendarReference,
    event,
  }: {
    bookingCalendarReference: PartialReference;
    event: CalendarEvent;
  }) {
    log.debug(
      "deleteCalendarEventForBookingReference",
      safeStringify({ bookingCalendarReference, event: getPiiFreeCalendarEvent(event) })
    );

    const {
      uid: bookingRefUid,
      externalCalendarId: bookingExternalCalendarId,
      credentialId,
      type: credentialType,
    } = bookingCalendarReference;

    const calendarCredential = await this.getCredentialAndWarnIfNotFound(credentialId, credentialType);
    if (calendarCredential) {
      await deleteEvent({
        credential: calendarCredential,
        bookingRefUid,
        event,
        externalCalendarId: bookingExternalCalendarId,
      });
    }
  }

  private async deleteVideoEventForBookingReference({
    bookingVideoReference,
  }: {
    bookingVideoReference: PartialReference;
  }) {
    log.debug("deleteVideoEventForBookingReference", safeStringify({ bookingVideoReference }));
    const { uid: bookingRefUid, credentialId } = bookingVideoReference;

    const videoCredential = await this.getCredentialAndWarnIfNotFound(
      credentialId,
      bookingVideoReference.type
    );

    if (videoCredential) {
      await deleteMeeting(videoCredential, bookingRefUid);
    }
  }

  private async getCredentialAndWarnIfNotFound(credentialId: number | null | undefined, type: string) {
    const credential =
      typeof credentialId === "number" && credentialId > 0
        ? await prisma.credential.findUnique({
            where: {
              id: credentialId,
            },
            select: credentialForCalendarServiceSelect,
          })
        : // Fallback for zero or nullish credentialId which could be the case of Global App e.g. dailyVideo
          this.videoCredentials.find((cred) => cred.type === type) ||
          this.calendarCredentials.find((cred) => cred.type === type) ||
          null;

    if (!credential) {
      log.error(
        "getCredentialAndWarnIfNotFound: Could not find credential",
        safeStringify({
          credentialId,
          type,
          videoCredentials: this.videoCredentials,
        })
      );
    }

    return credential;
  }

  /**
   * Takes a calendarEvent and a rescheduleUid and updates the event that has the
   * given uid using the data delivered in the given CalendarEvent.
   *
   * @param event
   */
  public async reschedule(
    event: CalendarEvent,
    rescheduleUid: string,
    newBookingId?: number,
    changedOrganizer?: boolean,
    newDestinationCalendar?: DestinationCalendar[] | null
  ): Promise<CreateUpdateResult> {
    const originalEvt = processLocation(event);
    const evt = cloneDeep(originalEvt);
    if (!rescheduleUid) {
      throw new Error("You called eventManager.update without an `rescheduleUid`. This should never happen.");
    }

    // Get details of existing booking.
    const booking = await prisma.booking.findFirst({
      where: {
        uid: rescheduleUid,
      },
      select: {
        id: true,
        userId: true,
        attendees: true,
        references: {
          // NOTE: id field removed from select as we don't require for deletingMany
          // but was giving error on recreate for reschedule, probably because promise.all() didn't finished
          select: {
            type: true,
            uid: true,
            meetingId: true,
            meetingPassword: true,
            meetingUrl: true,
            externalCalendarId: true,
            credentialId: true,
          },
        },
        destinationCalendar: true,
        payment: true,
        eventType: {
          select: {
            seatsPerTimeSlot: true,
            seatsShowAttendees: true,
            seatsShowAvailabilityCount: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error("booking not found");
    }

    const results: Array<EventResult<Event>> = [];
    const bookingReferenceChangedOrganizer: Array<PartialReference> = [];

    if (evt.requiresConfirmation) {
      log.debug("RescheduleRequiresConfirmation: Deleting Event and Meeting for previous booking");
      // As the reschedule requires confirmation, we can't update the events and meetings to new time yet. So, just delete them and let it be handled when organizer confirms the booking.
      await this.deleteEventsAndMeetings({ booking, event });
    } else {
      if (changedOrganizer) {
        log.debug("RescheduleOrganizerChanged: Deleting Event and Meeting for previous booking");
        await this.deleteEventsAndMeetings({ booking, event });

        log.debug("RescheduleOrganizerChanged: Creating Event and Meeting for for new booking");

        const newEvent = { ...evt, destinationCalendar: newDestinationCalendar };
        const createdEvent = await this.create(newEvent);
        results.push(...createdEvent.results);
        bookingReferenceChangedOrganizer.push(...createdEvent.referencesToCreate);
      } else {
        // If the reschedule doesn't require confirmation, we can "update" the events and meetings to new time.
        const isDedicated = evt.location ? isDedicatedIntegration(evt.location) : null;
        // If and only if event type is a dedicated meeting, update the dedicated video meeting.
        if (isDedicated) {
          const result = await this.updateVideoEvent(evt, booking);
          const [updatedEvent] = Array.isArray(result.updatedEvent)
            ? result.updatedEvent
            : [result.updatedEvent];

          if (updatedEvent) {
            evt.videoCallData = updatedEvent;
            evt.location = updatedEvent.url;
          }
          results.push(result);
        }

        const bookingCalendarReference = booking.references.find((reference) =>
          reference.type.includes("_calendar")
        );
        // There was a case that booking didn't had any reference and we don't want to throw error on function
        if (bookingCalendarReference) {
          // Update all calendar events.
          results.push(...(await this.updateAllCalendarEvents(evt, booking, newBookingId)));
        }
      }
    }
    const bookingPayment = booking?.payment;

    // Updating all payment to new
    if (bookingPayment && newBookingId) {
      const paymentIds = bookingPayment.map((payment) => payment.id);
      await prisma.payment.updateMany({
        where: {
          id: {
            in: paymentIds,
          },
        },
        data: {
          bookingId: newBookingId,
        },
      });
    }

    return {
      results,
      referencesToCreate: changedOrganizer ? bookingReferenceChangedOrganizer : [...booking.references],
    };
  }

  private async deleteEventsAndMeetings({
    event,
    booking,
  }: {
    event: CalendarEvent;
    booking: PartialBooking;
  }) {
    const calendarReferences = booking.references.filter((reference) => reference.type.includes("_calendar"));
    const videoReferences = booking.references.filter((reference) => reference.type.includes("_video"));
    log.debug("deleteEventsAndMeetings", safeStringify({ calendarReferences, videoReferences }));
    const calendarPromises = calendarReferences.map(async (bookingCalendarReference) => {
      return await this.deleteCalendarEventForBookingReference({
        bookingCalendarReference,
        event,
      });
    });

    const videoPromises = videoReferences.map(async (bookingVideoReference) => {
      return await this.deleteVideoEventForBookingReference({
        bookingVideoReference,
      });
    });

    const allPromises = [...calendarPromises, ...videoPromises];

    // Using allSettled to ensure that if one of the promises rejects, the others will still be executed.
    // Because we are just cleaning up the events and meetings, we don't want to throw an error if one of them fails.
    (await Promise.allSettled(allPromises)).some((result) => {
      if (result.status === "rejected") {
        // Make it a soft error because in case a PENDING booking is rescheduled there would be no calendar events or video meetings.
        log.warn(
          "Error deleting calendar event or video meeting for booking",
          safeStringify({ error: result.reason })
        );
      }
    });

    if (!allPromises.length) {
      log.warn("No calendar or video references found for booking - Couldn't delete events or meetings");
    }
  }

  public async updateCalendarAttendees(event: CalendarEvent, booking: PartialBooking) {
    if (booking.references.length === 0) {
      console.error("Tried to update references but there wasn't any.");
      return;
    }
    await this.updateAllCalendarEvents(event, booking);
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
   * @private
   */
  private async createAllCalendarEvents(event: CalendarEvent) {
    let createdEvents: EventResult<NewCalendarEventType>[] = [];

    const fallbackToFirstConnectedCalendar = async () => {
      /**
       *  Not ideal but, if we don't find a destination calendar,
       *  fallback to the first connected calendar - Shouldn't be a CRM calendar
       */
      const [credential] = this.calendarCredentials.filter((cred) => !cred.type.endsWith("other_calendar"));
      if (credential) {
        const createdEvent = await createEvent(credential, event);
        log.silly("Created Calendar event", safeStringify({ createdEvent }));
        if (createdEvent) {
          createdEvents.push(createdEvent);
        }
      }
    };

    if (event.destinationCalendar && event.destinationCalendar.length > 0) {
      // Since GCal pushes events to multiple calendars we only want to create one event per booking
      let gCalAdded = false;
      const destinationCalendars: DestinationCalendar[] = event.destinationCalendar.reduce(
        (destinationCals, cal) => {
          if (cal.integration === "google_calendar") {
            if (gCalAdded) {
              return destinationCals;
            } else {
              gCalAdded = true;
              destinationCals.push(cal);
            }
          } else {
            destinationCals.push(cal);
          }
          return destinationCals;
        },
        [] as DestinationCalendar[]
      );
      for (const destination of destinationCalendars) {
        log.silly("Creating Calendar event", JSON.stringify({ destination }));
        if (destination.credentialId) {
          let credential = this.calendarCredentials.find((c) => c.id === destination.credentialId);
          if (!credential) {
            // Fetch credential from DB
            const credentialFromDB = await prisma.credential.findUnique({
              where: {
                id: destination.credentialId,
              },
              select: credentialForCalendarServiceSelect,
            });
            if (credentialFromDB && credentialFromDB.appId) {
              credential = {
                id: credentialFromDB.id,
                type: credentialFromDB.type,
                key: credentialFromDB.key,
                userId: credentialFromDB.userId,
                teamId: credentialFromDB.teamId,
                invalid: credentialFromDB.invalid,
                appId: credentialFromDB.appId,
                user: credentialFromDB.user,
              };
            }
          }
          if (credential) {
            const createdEvent = await createEvent(credential, event, destination.externalId);
            if (createdEvent) {
              createdEvents.push(createdEvent);
            }
          }
        } else {
          const destinationCalendarCredentials = this.calendarCredentials.filter(
            (c) => c.type === destination.integration
          );
          // It might not be the first connected calendar as it seems that the order is not guaranteed to be ascending of credentialId.
          const firstCalendarCredential = destinationCalendarCredentials[0] as
            | (typeof destinationCalendarCredentials)[number]
            | undefined;

          if (!firstCalendarCredential) {
            log.warn(
              "No other credentials found of the same type as the destination calendar. Falling back to first connected calendar"
            );
            await fallbackToFirstConnectedCalendar();
          } else {
            log.warn(
              "No credentialId found for destination calendar, falling back to first found calendar of same type as destination calendar",
              safeStringify({
                destination: getPiiFreeDestinationCalendar(destination),
                firstConnectedCalendar: getPiiFreeCredential(firstCalendarCredential),
              })
            );
            createdEvents.push(await createEvent(firstCalendarCredential, event));
          }
        }
      }
    } else {
      log.warn(
        "No destination Calendar found, falling back to first connected calendar",
        safeStringify({
          calendarCredentials: this.calendarCredentials,
        })
      );
      await fallbackToFirstConnectedCalendar();
    }

    // Taking care of non-traditional calendar integrations
    createdEvents = createdEvents.concat(
      await Promise.all(
        this.calendarCredentials
          .filter((cred) => cred.type.includes("other_calendar"))
          .map(async (cred) => await createEvent(cred, event))
      )
    );

    return createdEvents;
  }

  /**
   * Checks which video integration is needed for the event's location and returns
   * credentials for that - if existing.
   * @param event
   * @private
   */

  private getVideoCredential(event: CalendarEvent): CredentialPayload | undefined {
    if (!event.location) {
      return undefined;
    }

    /** @fixme potential bug since Google Meet are saved as `integrations:google:meet` and there are no `google:meet` type in our DB */
    const integrationName = event.location.replace("integrations:", "");
    let videoCredential;
    if (event.conferenceCredentialId) {
      videoCredential = this.videoCredentials.find(
        (credential) => credential.id === event.conferenceCredentialId
      );
    } else {
      videoCredential = this.videoCredentials.find((credential: CredentialPayload) =>
        credential.type.includes(integrationName)
      );
      log.warn(
        `Could not find conferenceCredentialId for event with location: ${event.location}, trying to use last added video credential`
      );
    }

    /**
     * This might happen if someone tries to use a location with a missing credential, so we fallback to Cal Video.
     * @todo remove location from event types that has missing credentials
     * */
    if (!videoCredential) {
      log.warn(
        `Falling back to "daily" video integration for event with location: ${event.location} because credential is missing for the app`
      );
      videoCredential = { ...FAKE_DAILY_CREDENTIAL };
    }

    return videoCredential;
  }

  /**
   * Creates a video event entry for the selected integration location.
   *
   * When optional uid is set, it will be used instead of the auto generated uid.
   *
   * @param event
   * @private
   */
  private async createVideoEvent(event: CalendarEvent) {
    const credential = this.getVideoCredential(event);
    if (credential) {
      return createMeeting(credential, event);
    } else {
      return Promise.reject(
        `No suitable credentials given for the requested integration name:${event.location}`
      );
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
   * @private
   */
  private async updateAllCalendarEvents(
    event: CalendarEvent,
    booking: PartialBooking,
    newBookingId?: number
  ): Promise<Array<EventResult<NewCalendarEventType>>> {
    let calendarReference: PartialReference[] | undefined = undefined,
      credential;
    log.silly("updateAllCalendarEvents", JSON.stringify({ event, booking, newBookingId }));
    try {
      // If a newBookingId is given, update that calendar event
      let newBooking;
      if (newBookingId) {
        newBooking = await prisma.booking.findUnique({
          where: {
            id: newBookingId,
          },
          select: {
            references: true,
          },
        });
      }

      calendarReference = newBooking?.references.length
        ? newBooking.references.filter((reference) => reference.type.includes("_calendar"))
        : booking.references.filter((reference) => reference.type.includes("_calendar"));

      if (calendarReference.length === 0) {
        return [];
      }
      // process all calendar references
      let result = [];
      for (const reference of calendarReference) {
        const { uid: bookingRefUid, externalCalendarId: bookingExternalCalendarId } = reference;
        let calenderExternalId: string | null = null;
        if (bookingExternalCalendarId) {
          calenderExternalId = bookingExternalCalendarId;
        }

        if (reference.credentialId) {
          credential = this.calendarCredentials.filter(
            (credential) => credential.id === reference?.credentialId
          )[0];
          if (!credential) {
            // Fetch credential from DB
            const credentialFromDB = await prisma.credential.findUnique({
              where: {
                id: reference.credentialId,
              },
              select: credentialForCalendarServiceSelect,
            });
            if (credentialFromDB && credentialFromDB.appId) {
              credential = {
                id: credentialFromDB.id,
                type: credentialFromDB.type,
                key: credentialFromDB.key,
                userId: credentialFromDB.userId,
                teamId: credentialFromDB.teamId,
                invalid: credentialFromDB.invalid,
                appId: credentialFromDB.appId,
                user: credentialFromDB.user,
              };
            }
          }
          result.push(updateEvent(credential, event, bookingRefUid, calenderExternalId));
        } else {
          const credentials = this.calendarCredentials.filter(
            (credential) => credential.type === reference?.type
          );
          for (const credential of credentials) {
            log.silly("updateAllCalendarEvents-credential", JSON.stringify({ credentials }));
            result.push(updateEvent(credential, event, bookingRefUid, calenderExternalId));
          }
        }
      }
      // If we are merging two calendar events we should delete the old calendar event
      if (newBookingId) {
        const oldCalendarEvent = booking.references.find((reference) => reference.type.includes("_calendar"));

        if (oldCalendarEvent?.credentialId) {
          const calendarCredential = await prisma.credential.findUnique({
            where: {
              id: oldCalendarEvent.credentialId,
            },
            select: credentialForCalendarServiceSelect,
          });
          const calendar = await getCalendar(calendarCredential);
          await calendar?.deleteEvent(oldCalendarEvent.uid, event, oldCalendarEvent.externalCalendarId);
        }
      }

      // Taking care of non-traditional calendar integrations
      result = result.concat(
        this.calendarCredentials
          .filter((cred) => cred.type.includes("other_calendar"))
          .map(async (cred) => {
            const calendarReference = booking.references.find((ref) => ref.type === cred.type);

            if (!calendarReference) {
              return {
                appName: cred.appId || "",
                type: cred.type,
                success: false,
                uid: "",
                originalEvent: event,
                credentialId: cred.id,
              };
            }
            const { externalCalendarId: bookingExternalCalendarId, meetingId: bookingRefUid } =
              calendarReference;
            return await updateEvent(cred, event, bookingRefUid ?? null, bookingExternalCalendarId ?? null);
          })
      );

      return Promise.all(result);
    } catch (error) {
      let message = `Tried to 'updateAllCalendarEvents' but there was no '{thing}' for '${credential?.type}', userId: '${credential?.userId}', bookingId: '${booking?.id}'`;
      if (error instanceof Error) {
        message = message.replace("{thing}", error.message);
      }

      return Promise.resolve(
        calendarReference?.map((reference) => {
          return {
            appName: "none",
            type: reference?.type || "calendar",
            success: false,
            uid: "",
            originalEvent: event,
            credentialId: 0,
          };
        }) ?? ([] as Array<EventResult<NewCalendarEventType>>)
      );
    }
  }

  /**
   * Updates a single video event.
   *
   * @param event
   * @param booking
   * @private
   */
  private async updateVideoEvent(event: CalendarEvent, booking: PartialBooking) {
    const credential = this.getVideoCredential(event);

    if (credential) {
      const bookingRef = booking ? booking.references.filter((ref) => ref.type === credential.type)[0] : null;
      return updateMeeting(credential, event, bookingRef);
    } else {
      return Promise.reject(
        `No suitable credentials given for the requested integration name:${event.location}`
      );
    }
  }
}
