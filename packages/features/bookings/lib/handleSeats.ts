import type { Prisma, Attendee } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";
import type { TFunction } from "next-i18next";
import type short from "short-uuid";
import { uuid } from "short-uuid";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import EventManager from "@calcom/core/EventManager";
import { deleteMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { sendRescheduledEmails, sendRescheduledSeatEmail, sendScheduledSeatsEmails } from "@calcom/emails";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import type { getFullName } from "@calcom/features/form-builder/utils";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import { HttpError } from "@calcom/lib/http-error";
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { AdditionalInformation, AppsStatus, CalendarEvent, Person } from "@calcom/types/Calendar";

import type { EventTypeInfo } from "../../webhooks/lib/sendPayload";
import {
  refreshCredentials,
  addVideoCallDataToEvt,
  createLoggerWithEventDetails,
  handleAppsStatus,
  findBookingQuery,
} from "./handleNewBooking";
import type {
  Booking,
  Invitee,
  NewBookingEventType,
  getAllCredentials,
  OrganizerUser,
  OriginalRescheduledBooking,
  RescheduleReason,
  NoEmail,
  IsConfirmedByDefault,
  AdditionalNotes,
  ReqAppsStatus,
  PaymentAppData,
  IEventTypePaymentCredentialType,
  SmsReminderNumber,
  EventTypeId,
  ReqBodyMetadata,
} from "./handleNewBooking";

export type BookingSeat = Prisma.BookingSeatGetPayload<{ include: { booking: true; attendee: true } }> | null;

/* Check if the original booking has no more attendees, if so delete the booking
  and any calendar or video integrations */
const lastAttendeeDeleteBooking = async (
  originalRescheduledBooking: OriginalRescheduledBooking,
  filteredAttendees: Partial<Attendee>[],
  originalBookingEvt?: CalendarEvent
) => {
  let deletedReferences = false;
  if (filteredAttendees && filteredAttendees.length === 0 && originalRescheduledBooking) {
    const integrationsToDelete = [];

    for (const reference of originalRescheduledBooking.references) {
      if (reference.credentialId) {
        const credential = await prisma.credential.findUnique({
          where: {
            id: reference.credentialId,
          },
          select: credentialForCalendarServiceSelect,
        });

        if (credential) {
          if (reference.type.includes("_video")) {
            integrationsToDelete.push(deleteMeeting(credential, reference.uid));
          }
          if (reference.type.includes("_calendar") && originalBookingEvt) {
            const calendar = await getCalendar(credential);
            if (calendar) {
              integrationsToDelete.push(
                calendar?.deleteEvent(reference.uid, originalBookingEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    await Promise.all(integrationsToDelete).then(async () => {
      await prisma.booking.update({
        where: {
          id: originalRescheduledBooking.id,
        },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });
    });
    deletedReferences = true;
  }
  return deletedReferences;
};

const handleSeats = async ({
  rescheduleUid,
  reqBookingUid,
  eventType,
  evt,
  invitee,
  allCredentials,
  organizerUser,
  originalRescheduledBooking,
  bookerEmail,
  tAttendees,
  bookingSeat,
  reqUserId,
  rescheduleReason,
  reqBodyUser,
  noEmail,
  isConfirmedByDefault,
  additionalNotes,
  reqAppsStatus,
  attendeeLanguage,
  paymentAppData,
  fullName,
  smsReminderNumber,
  eventTypeInfo,
  uid,
  eventTypeId,
  reqBodyMetadata,
  subscriberOptions,
  eventTrigger,
}: {
  rescheduleUid: string;
  reqBookingUid: string;
  eventType: NewBookingEventType;
  evt: CalendarEvent;
  invitee: Invitee;
  allCredentials: Awaited<ReturnType<typeof getAllCredentials>>;
  organizerUser: OrganizerUser;
  originalRescheduledBooking: OriginalRescheduledBooking;
  bookerEmail: string;
  tAttendees: TFunction;
  bookingSeat: BookingSeat;
  reqUserId: number | undefined;
  rescheduleReason: RescheduleReason;
  reqBodyUser: string | string[] | undefined;
  noEmail: NoEmail;
  isConfirmedByDefault: IsConfirmedByDefault;
  additionalNotes: AdditionalNotes;
  reqAppsStatus: ReqAppsStatus;
  attendeeLanguage: string | null;
  paymentAppData: PaymentAppData;
  fullName: ReturnType<typeof getFullName>;
  smsReminderNumber: SmsReminderNumber;
  eventTypeInfo: EventTypeInfo;
  uid: short.SUUID;
  eventTypeId: EventTypeId;
  reqBodyMetadata: ReqBodyMetadata;
  subscriberOptions: GetSubscriberOptions;
  eventTrigger: WebhookTriggerEvents;
}) => {
  const loggerWithEventDetails = createLoggerWithEventDetails(eventType.id, reqBodyUser, eventType.slug);

  let resultBooking:
    | (Partial<Booking> & {
        appsStatus?: AppsStatus[];
        seatReferenceUid?: string;
        paymentUid?: string;
        message?: string;
        paymentId?: number;
      })
    | null = null;

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        {
          uid: rescheduleUid || reqBookingUid,
        },
        {
          eventTypeId: eventType.id,
          startTime: evt.startTime,
        },
      ],
      status: BookingStatus.ACCEPTED,
    },
    select: {
      uid: true,
      id: true,
      attendees: { include: { bookingSeat: true } },
      userId: true,
      references: true,
      startTime: true,
      user: true,
      status: true,
      smsReminderNumber: true,
      endTime: true,
      scheduledJobs: true,
    },
  });

  if (!booking) {
    throw new HttpError({ statusCode: 404, message: "Could not find booking" });
  }

  // See if attendee is already signed up for timeslot
  if (
    booking.attendees.find((attendee) => attendee.email === invitee[0].email) &&
    dayjs.utc(booking.startTime).format() === evt.startTime
  ) {
    throw new HttpError({ statusCode: 409, message: "Already signed up for this booking." });
  }

  // There are two paths here, reschedule a booking with seats and booking seats without reschedule
  if (rescheduleUid) {
    // See if the new date has a booking already
    const newTimeSlotBooking = await prisma.booking.findFirst({
      where: {
        startTime: evt.startTime,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      },
      select: {
        id: true,
        uid: true,
        attendees: {
          include: {
            bookingSeat: true,
          },
        },
      },
    });

    const credentials = await refreshCredentials(allCredentials);
    const eventManager = new EventManager({ ...organizerUser, credentials });

    if (!originalRescheduledBooking) {
      // typescript isn't smart enough;
      throw new Error("Internal Error.");
    }

    const updatedBookingAttendees = originalRescheduledBooking.attendees.reduce(
      (filteredAttendees, attendee) => {
        if (attendee.email === bookerEmail) {
          return filteredAttendees; // skip current booker, as we know the language already.
        }
        filteredAttendees.push({
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: { translate: tAttendees, locale: attendee.locale ?? "en" },
        });
        return filteredAttendees;
      },
      [] as Person[]
    );

    // If original booking has video reference we need to add the videoCallData to the new evt
    const videoReference = originalRescheduledBooking.references.find((reference) =>
      reference.type.includes("_video")
    );

    const originalBookingEvt = {
      ...evt,
      title: originalRescheduledBooking.title,
      startTime: dayjs(originalRescheduledBooking.startTime).utc().format(),
      endTime: dayjs(originalRescheduledBooking.endTime).utc().format(),
      attendees: updatedBookingAttendees,
      // If the location is a video integration then include the videoCallData
      ...(videoReference && {
        videoCallData: {
          type: videoReference.type,
          id: videoReference.meetingId,
          password: videoReference.meetingPassword,
          url: videoReference.meetingUrl,
        },
      }),
    };

    if (!bookingSeat) {
      // if no bookingSeat is given and the userId != owner, 401.
      // TODO: Next step; Evaluate ownership, what about teams?
      if (booking.user?.id !== reqUserId) {
        throw new HttpError({ statusCode: 401 });
      }

      // Moving forward in this block is the owner making changes to the booking. All attendees should be affected
      evt.attendees = originalRescheduledBooking.attendees.map((attendee) => {
        return {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: { translate: tAttendees, locale: attendee.locale ?? "en" },
        };
      });

      // If owner reschedules the event we want to update the entire booking
      // Also if owner is rescheduling there should be no bookingSeat

      // If there is no booking during the new time slot then update the current booking to the new date
      if (!newTimeSlotBooking) {
        const newBooking: (Booking & { appsStatus?: AppsStatus[] }) | null = await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            startTime: evt.startTime,
            endTime: evt.endTime,
            cancellationReason: rescheduleReason,
          },
          include: {
            user: true,
            references: true,
            payment: true,
            attendees: true,
          },
        });

        evt = addVideoCallDataToEvt(newBooking.references, evt);

        const copyEvent = cloneDeep(evt);

        const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newBooking.id);

        // @NOTE: This code is duplicated and should be moved to a function
        // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
        // to the default description when we are sending the emails.
        evt.description = eventType.description;

        const results = updateManager.results;

        const calendarResult = results.find((result) => result.type.includes("_calendar"));

        evt.iCalUID = calendarResult?.updatedEvent.iCalUID || undefined;

        if (results.length > 0 && results.some((res) => !res.success)) {
          const error = {
            errorCode: "BookingReschedulingMeetingFailed",
            message: "Booking Rescheduling failed",
          };
          loggerWithEventDetails.error(
            `Booking ${organizerUser.name} failed`,
            JSON.stringify({ error, results })
          );
        } else {
          const metadata: AdditionalInformation = {};
          if (results.length) {
            // TODO: Handle created event metadata more elegantly
            const [updatedEvent] = Array.isArray(results[0].updatedEvent)
              ? results[0].updatedEvent
              : [results[0].updatedEvent];
            if (updatedEvent) {
              metadata.hangoutLink = updatedEvent.hangoutLink;
              metadata.conferenceData = updatedEvent.conferenceData;
              metadata.entryPoints = updatedEvent.entryPoints;
              evt.appsStatus = handleAppsStatus(results, newBooking, reqAppsStatus);
            }
          }
        }

        if (noEmail !== true && isConfirmedByDefault) {
          const copyEvent = cloneDeep(evt);
          loggerWithEventDetails.debug("Emails: Sending reschedule emails - handleSeats");
          await sendRescheduledEmails({
            ...copyEvent,
            additionalNotes, // Resets back to the additionalNote input and not the override value
            cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
          });
        }
        const foundBooking = await findBookingQuery(newBooking.id);

        resultBooking = { ...foundBooking, appsStatus: newBooking.appsStatus };
      } else {
        // Merge two bookings together
        const attendeesToMove = [],
          attendeesToDelete = [];

        for (const attendee of booking.attendees) {
          // If the attendee already exists on the new booking then delete the attendee record of the old booking
          if (
            newTimeSlotBooking.attendees.some(
              (newBookingAttendee) => newBookingAttendee.email === attendee.email
            )
          ) {
            attendeesToDelete.push(attendee.id);
            // If the attendee does not exist on the new booking then move that attendee record to the new booking
          } else {
            attendeesToMove.push({ id: attendee.id, seatReferenceId: attendee.bookingSeat?.id });
          }
        }

        // Confirm that the new event will have enough available seats
        if (
          !eventType.seatsPerTimeSlot ||
          attendeesToMove.length +
            newTimeSlotBooking.attendees.filter((attendee) => attendee.bookingSeat).length >
            eventType.seatsPerTimeSlot
        ) {
          throw new HttpError({ statusCode: 409, message: "Booking does not have enough available seats" });
        }

        const moveAttendeeCalls = [];
        for (const attendeeToMove of attendeesToMove) {
          moveAttendeeCalls.push(
            prisma.attendee.update({
              where: {
                id: attendeeToMove.id,
              },
              data: {
                bookingId: newTimeSlotBooking.id,
                bookingSeat: {
                  upsert: {
                    create: {
                      referenceUid: uuid(),
                      bookingId: newTimeSlotBooking.id,
                    },
                    update: {
                      bookingId: newTimeSlotBooking.id,
                    },
                  },
                },
              },
            })
          );
        }

        await Promise.all([
          ...moveAttendeeCalls,
          // Delete any attendees that are already a part of that new time slot booking
          prisma.attendee.deleteMany({
            where: {
              id: {
                in: attendeesToDelete,
              },
            },
          }),
        ]);

        const updatedNewBooking = await prisma.booking.findUnique({
          where: {
            id: newTimeSlotBooking.id,
          },
          include: {
            attendees: true,
            references: true,
          },
        });

        if (!updatedNewBooking) {
          throw new HttpError({ statusCode: 404, message: "Updated booking not found" });
        }

        // Update the evt object with the new attendees
        const updatedBookingAttendees = updatedNewBooking.attendees.map((attendee) => {
          const evtAttendee = {
            ...attendee,
            language: { translate: tAttendees, locale: attendeeLanguage ?? "en" },
          };
          return evtAttendee;
        });

        evt.attendees = updatedBookingAttendees;

        evt = addVideoCallDataToEvt(updatedNewBooking.references, evt);

        const copyEvent = cloneDeep(evt);

        const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newTimeSlotBooking.id);

        const results = updateManager.results;

        const calendarResult = results.find((result) => result.type.includes("_calendar"));

        evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
          ? calendarResult?.updatedEvent[0]?.iCalUID
          : calendarResult?.updatedEvent?.iCalUID || undefined;

        if (noEmail !== true && isConfirmedByDefault) {
          // TODO send reschedule emails to attendees of the old booking
          loggerWithEventDetails.debug("Emails: Sending reschedule emails - handleSeats");
          await sendRescheduledEmails({
            ...copyEvent,
            additionalNotes, // Resets back to the additionalNote input and not the override value
            cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
          });
        }

        // Update the old booking with the cancelled status
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: BookingStatus.CANCELLED,
          },
        });

        const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

        resultBooking = { ...foundBooking };
      }
    }

    // seatAttendee is null when the organizer is rescheduling.
    const seatAttendee: Partial<Person> | null = bookingSeat?.attendee || null;
    if (seatAttendee) {
      seatAttendee["language"] = { translate: tAttendees, locale: bookingSeat?.attendee.locale ?? "en" };

      // If there is no booking then remove the attendee from the old booking and create a new one
      if (!newTimeSlotBooking) {
        await prisma.attendee.delete({
          where: {
            id: seatAttendee?.id,
          },
        });

        // Update the original calendar event by removing the attendee that is rescheduling
        if (originalBookingEvt && originalRescheduledBooking) {
          // Event would probably be deleted so we first check than instead of updating references
          const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
            return attendee.email !== bookerEmail;
          });
          const deletedReference = await lastAttendeeDeleteBooking(
            originalRescheduledBooking,
            filteredAttendees,
            originalBookingEvt
          );

          if (!deletedReference) {
            await eventManager.updateCalendarAttendees(originalBookingEvt, originalRescheduledBooking);
          }
        }

        // We don't want to trigger rescheduling logic of the original booking
        originalRescheduledBooking = null;

        return null;
      }

      // Need to change the new seat reference and attendee record to remove it from the old booking and add it to the new booking
      // https://stackoverflow.com/questions/4980963/database-insert-new-rows-or-update-existing-ones
      if (seatAttendee?.id && bookingSeat?.id) {
        await Promise.all([
          await prisma.attendee.update({
            where: {
              id: seatAttendee.id,
            },
            data: {
              bookingId: newTimeSlotBooking.id,
            },
          }),
          await prisma.bookingSeat.update({
            where: {
              id: bookingSeat.id,
            },
            data: {
              bookingId: newTimeSlotBooking.id,
            },
          }),
        ]);
      }

      const copyEvent = cloneDeep(evt);

      const updateManager = await eventManager.reschedule(copyEvent, rescheduleUid, newTimeSlotBooking.id);

      const results = updateManager.results;

      const calendarResult = results.find((result) => result.type.includes("_calendar"));

      evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
        ? calendarResult?.updatedEvent[0]?.iCalUID
        : calendarResult?.updatedEvent?.iCalUID || undefined;

      await sendRescheduledSeatEmail(copyEvent, seatAttendee as Person);
      const filteredAttendees = originalRescheduledBooking?.attendees.filter((attendee) => {
        return attendee.email !== bookerEmail;
      });
      await lastAttendeeDeleteBooking(originalRescheduledBooking, filteredAttendees, originalBookingEvt);

      const foundBooking = await findBookingQuery(newTimeSlotBooking.id);

      resultBooking = { ...foundBooking, seatReferenceUid: bookingSeat?.referenceUid };
    }
  } else {
    // Need to add translation for attendees to pass type checks. Since these values are never written to the db we can just use the new attendee language
    const bookingAttendees = booking.attendees.map((attendee) => {
      return { ...attendee, language: { translate: tAttendees, locale: attendeeLanguage ?? "en" } };
    });

    evt = { ...evt, attendees: [...bookingAttendees, invitee[0]] };

    if (eventType.seatsPerTimeSlot && eventType.seatsPerTimeSlot <= booking.attendees.length) {
      throw new HttpError({ statusCode: 409, message: "Booking seats are full" });
    }

    const videoCallReference = booking.references.find((reference) => reference.type.includes("_video"));

    if (videoCallReference) {
      evt.videoCallData = {
        type: videoCallReference.type,
        id: videoCallReference.meetingId,
        password: videoCallReference?.meetingPassword,
        url: videoCallReference.meetingUrl,
      };
    }

    const attendeeUniqueId = uuid();

    await prisma.booking.update({
      where: {
        uid: reqBookingUid,
      },
      include: {
        attendees: true,
      },
      data: {
        attendees: {
          create: {
            email: invitee[0].email,
            name: invitee[0].name,
            timeZone: invitee[0].timeZone,
            locale: invitee[0].language.locale,
            bookingSeat: {
              create: {
                referenceUid: attendeeUniqueId,
                data: {
                  description: additionalNotes,
                },
                booking: {
                  connect: {
                    id: booking.id,
                  },
                },
              },
            },
          },
        },
        ...(booking.status === BookingStatus.CANCELLED && { status: BookingStatus.ACCEPTED }),
      },
    });

    evt.attendeeSeatId = attendeeUniqueId;

    const newSeat = booking.attendees.length !== 0;

    /**
     * Remember objects are passed into functions as references
     * so if you modify it in a inner function it will be modified in the outer function
     * deep cloning evt to avoid this
     */
    if (!evt?.uid) {
      evt.uid = booking?.uid ?? null;
    }
    const copyEvent = cloneDeep(evt);
    copyEvent.uid = booking.uid;
    if (noEmail !== true) {
      let isHostConfirmationEmailsDisabled = false;
      let isAttendeeConfirmationEmailDisabled = false;

      const workflows = eventType.workflows.map((workflow) => workflow.workflow);

      if (eventType.workflows) {
        isHostConfirmationEmailsDisabled =
          eventType.metadata?.disableStandardEmails?.confirmation?.host || false;
        isAttendeeConfirmationEmailDisabled =
          eventType.metadata?.disableStandardEmails?.confirmation?.attendee || false;

        if (isHostConfirmationEmailsDisabled) {
          isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
        }

        if (isAttendeeConfirmationEmailDisabled) {
          isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
        }
      }
      await sendScheduledSeatsEmails(
        copyEvent,
        invitee[0],
        newSeat,
        !!eventType.seatsShowAttendees,
        isHostConfirmationEmailsDisabled,
        isAttendeeConfirmationEmailDisabled
      );
    }
    const credentials = await refreshCredentials(allCredentials);
    const eventManager = new EventManager({ ...organizerUser, credentials });
    await eventManager.updateCalendarAttendees(evt, booking);

    const foundBooking = await findBookingQuery(booking.id);

    if (!Number.isNaN(paymentAppData.price) && paymentAppData.price > 0 && !!booking) {
      const credentialPaymentAppCategories = await prisma.credential.findMany({
        where: {
          ...(paymentAppData.credentialId
            ? { id: paymentAppData.credentialId }
            : { userId: organizerUser.id }),
          app: {
            categories: {
              hasSome: ["payment"],
            },
          },
        },
        select: {
          key: true,
          appId: true,
          app: {
            select: {
              categories: true,
              dirName: true,
            },
          },
        },
      });

      const eventTypePaymentAppCredential = credentialPaymentAppCategories.find((credential) => {
        return credential.appId === paymentAppData.appId;
      });

      if (!eventTypePaymentAppCredential) {
        throw new HttpError({ statusCode: 400, message: "Missing payment credentials" });
      }
      if (!eventTypePaymentAppCredential?.appId) {
        throw new HttpError({ statusCode: 400, message: "Missing payment app id" });
      }

      const payment = await handlePayment(
        evt,
        eventType,
        eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
        booking,
        fullName,
        bookerEmail
      );

      resultBooking = { ...foundBooking };
      resultBooking["message"] = "Payment required";
      resultBooking["paymentUid"] = payment?.uid;
      resultBooking["id"] = payment?.id;
    } else {
      resultBooking = { ...foundBooking };
    }

    resultBooking["seatReferenceUid"] = evt.attendeeSeatId;
  }

  // Here we should handle every after action that needs to be done after booking creation

  // Obtain event metadata that includes videoCallUrl
  const metadata = evt.videoCallData?.url ? { videoCallUrl: evt.videoCallData.url } : undefined;
  try {
    await scheduleWorkflowReminders({
      workflows: eventType.workflows,
      smsReminderNumber: smsReminderNumber || null,
      calendarEvent: { ...evt, ...{ metadata, eventType: { slug: eventType.slug } } },
      isNotConfirmed: evt.requiresConfirmation || false,
      isRescheduleEvent: !!rescheduleUid,
      isFirstRecurringEvent: true,
      emailAttendeeSendToOverride: bookerEmail,
      seatReferenceUid: evt.attendeeSeatId,
      eventTypeRequiresConfirmation: eventType.requiresConfirmation,
    });
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling workflow reminders", JSON.stringify({ error }));
  }

  const webhookData = {
    ...evt,
    ...eventTypeInfo,
    uid: resultBooking?.uid || uid,
    bookingId: booking?.id,
    rescheduleUid,
    rescheduleStartTime: originalRescheduledBooking?.startTime
      ? dayjs(originalRescheduledBooking?.startTime).utc().format()
      : undefined,
    rescheduleEndTime: originalRescheduledBooking?.endTime
      ? dayjs(originalRescheduledBooking?.endTime).utc().format()
      : undefined,
    metadata: { ...metadata, ...reqBodyMetadata },
    eventTypeId,
    status: "ACCEPTED",
    smsReminderNumber: booking?.smsReminderNumber || undefined,
  };

  await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData });

  return resultBooking;
};

export default handleSeats;
