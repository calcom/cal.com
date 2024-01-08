import type { Prisma, WorkflowReminder } from "@prisma/client";
import type { NextApiRequest } from "next";

import appStore from "@calcom/app-store";
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { DailyLocationType } from "@calcom/app-store/locations";
import { deleteMeeting, updateMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmails, sendCancelledSeatEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { deleteScheduledWhatsappReminder } from "@calcom/features/ee/workflows/lib/reminders/whatsappReminderManager";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { cancelScheduledJobs } from "@calcom/features/webhooks/lib/scheduleTrigger";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { handleRefundError } from "@calcom/lib/payment/handleRefundError";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus, MembershipRole, WebhookTriggerEvents, WorkflowMethods } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

async function getBookingToDelete(id: number | undefined, uid: string | undefined) {
  return await prisma.booking.findUnique({
    where: {
      id,
      uid,
    },
    select: {
      ...bookingMinimalSelect,
      recurringEventId: true,
      userId: true,
      user: {
        select: {
          id: true,
          credentials: { select: credentialForCalendarServiceSelect }, // Not leaking at the moment, be careful with
          email: true,
          timeZone: true,
          timeFormat: true,
          name: true,
          destinationCalendar: true,
        },
      },
      location: true,
      references: {
        select: {
          uid: true,
          type: true,
          externalCalendarId: true,
          credentialId: true,
        },
      },
      payment: true,
      paid: true,
      eventType: {
        select: {
          slug: true,
          owner: {
            select: {
              id: true,
              hideBranding: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          recurringEvent: true,
          title: true,
          eventName: true,
          description: true,
          requiresConfirmation: true,
          price: true,
          currency: true,
          length: true,
          seatsPerTimeSlot: true,
          bookingFields: true,
          seatsShowAttendees: true,
          hosts: {
            select: {
              user: true,
            },
          },
          workflows: {
            include: {
              workflow: {
                include: {
                  steps: true,
                },
              },
            },
          },
          parentId: true,
        },
      },
      uid: true,
      id: true,
      eventTypeId: true,
      destinationCalendar: true,
      smsReminderNumber: true,
      workflowReminders: true,
      scheduledJobs: true,
      seatsReferences: true,
      responses: true,
      iCalUID: true,
      iCalSequence: true,
    },
  });
}

type CustomRequest = NextApiRequest & {
  userId?: number;
  bookingToDelete?: Awaited<ReturnType<typeof getBookingToDelete>>;
};

async function handler(req: CustomRequest) {
  const { id, uid, allRemainingBookings, cancellationReason, seatReferenceUid } =
    schemaBookingCancelParams.parse(req.body);
  req.bookingToDelete = await getBookingToDelete(id, uid);
  const { bookingToDelete, userId } = req;

  if (!bookingToDelete || !bookingToDelete.user) {
    throw new HttpError({ statusCode: 400, message: "Booking not found" });
  }

  if (!bookingToDelete.userId) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  // If the booking is a seated event and there is no seatReferenceUid we should validate that logged in user is host
  if (bookingToDelete.eventType?.seatsPerTimeSlot && !seatReferenceUid) {
    const userIsHost = bookingToDelete.eventType.hosts.find((host) => {
      if (host.user.id === userId) return true;
    });

    const userIsOwnerOfEventType = bookingToDelete.eventType.owner?.id === userId;

    if (!userIsHost && !userIsOwnerOfEventType) {
      throw new HttpError({ statusCode: 401, message: "User not a host of this event" });
    }
  }

  // get webhooks
  const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: bookingToDelete.eventType?.team?.id ?? null },
      parentId: bookingToDelete?.eventType?.parentId ?? null,
    },
  });
  const triggerForUser = !teamId || (teamId && bookingToDelete.eventType?.parentId);

  const subscriberOptions = {
    userId: triggerForUser ? bookingToDelete.userId : null,
    eventTypeId: bookingToDelete.eventTypeId as number,
    triggerEvent: eventTrigger,
    teamId,
  };
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: bookingToDelete?.eventType?.title || null,
    eventDescription: bookingToDelete?.eventType?.description || null,
    requiresConfirmation: bookingToDelete?.eventType?.requiresConfirmation || null,
    price: bookingToDelete?.eventType?.price || null,
    currency: bookingToDelete?.eventType?.currency || null,
    length: bookingToDelete?.eventType?.length || null,
  };

  const webhooks = await getWebhooks(subscriberOptions);

  const organizer = await prisma.user.findFirstOrThrow({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      timeFormat: true,
      locale: true,
    },
  });

  const teamMembersPromises = [];
  const attendeesListPromises = [];
  const hostsPresent = !!bookingToDelete.eventType?.hosts;

  for (const attendee of bookingToDelete.attendees) {
    const attendeeObject = {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };

    // Check for the presence of hosts to determine if it is a team event type
    if (hostsPresent) {
      // If the attendee is a host then they are a team member
      const teamMember = bookingToDelete.eventType?.hosts.some((host) => host.user.email === attendee.email);
      if (teamMember) {
        teamMembersPromises.push(attendeeObject);
        // If not then they are an attendee
      } else {
        attendeesListPromises.push(attendeeObject);
      }
    } else {
      attendeesListPromises.push(attendeeObject);
    }
  }

  const attendeesList = await Promise.all(attendeesListPromises);
  const teamMembers = await Promise.all(teamMembersPromises);
  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

  const evt: CalendarEvent = {
    title: bookingToDelete?.title,
    type: bookingToDelete?.eventType?.slug as string,
    description: bookingToDelete?.description || "",
    customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
    eventTypeId: bookingToDelete.eventTypeId as number,
    ...getCalEventResponses({
      bookingFields: bookingToDelete.eventType?.bookingFields ?? null,
      booking: bookingToDelete,
    }),
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      email: organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: bookingToDelete?.uid,
    bookingId: bookingToDelete?.id,
    /* Include recurringEvent information only when cancelling all bookings */
    recurringEvent: allRemainingBookings
      ? parseRecurringEvent(bookingToDelete.eventType?.recurringEvent)
      : undefined,
    location: bookingToDelete?.location,
    destinationCalendar: bookingToDelete?.destinationCalendar
      ? [bookingToDelete?.destinationCalendar]
      : bookingToDelete?.user.destinationCalendar
      ? [bookingToDelete?.user.destinationCalendar]
      : [],
    cancellationReason: cancellationReason,
    ...(teamMembers && {
      team: { name: bookingToDelete?.eventType?.team?.name || "Nameless", members: teamMembers, id: teamId! },
    }),
    seatsPerTimeSlot: bookingToDelete.eventType?.seatsPerTimeSlot,
    seatsShowAttendees: bookingToDelete.eventType?.seatsShowAttendees,
    iCalUID: bookingToDelete.iCalUID,
    iCalSequence: bookingToDelete.iCalSequence + 1,
  };

  const dataForWebhooks = { evt, webhooks, eventTypeInfo };

  // If it's just an attendee of a booking then just remove them from that booking
  const result = await handleSeatedEventCancellation(req, dataForWebhooks);
  if (result) return { success: true };

  // If it's just an attendee of a booking then just remove them from that booking
  if (seatReferenceUid && bookingToDelete.attendees.length > 1) {
    const seatReference = bookingToDelete.seatsReferences.find(
      (reference) => reference.referenceUid === seatReferenceUid
    );

    const attendee = bookingToDelete.attendees.find((attendee) => attendee.id === seatReference?.attendeeId);

    if (!seatReference || !attendee)
      throw new HttpError({ statusCode: 400, message: "User not a part of this booking" });

    await prisma.attendee.delete({
      where: {
        id: seatReference.attendeeId,
      },
    });

    req.statusCode = 200;
    return { message: "No longer attending event" };
  }

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
    }).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);

  //Workflows - schedule reminders
  if (bookingToDelete.eventType?.workflows) {
    await sendCancelledReminders({
      workflows: bookingToDelete.eventType?.workflows,
      smsReminderNumber: bookingToDelete.smsReminderNumber,
      evt: {
        ...evt,
        ...{ eventType: { slug: bookingToDelete.eventType.slug } },
      },
      hideBranding: !!bookingToDelete.eventType.owner?.hideBranding,
      eventTypeRequiresConfirmation: bookingToDelete.eventType.requiresConfirmation,
    });
  }

  let updatedBookings: {
    uid: string;
    workflowReminders: WorkflowReminder[];
    scheduledJobs: string[];
    references: {
      type: string;
      credentialId: number | null;
      uid: string;
      externalCalendarId: string | null;
    }[];
    startTime: Date;
    endTime: Date;
  }[] = [];

  // by cancelling first, and blocking whilst doing so; we can ensure a cancel
  // action always succeeds even if subsequent integrations fail cancellation.
  if (bookingToDelete.eventType?.recurringEvent && bookingToDelete.recurringEventId && allRemainingBookings) {
    const recurringEventId = bookingToDelete.recurringEventId;
    // Proceed to mark as cancelled all remaining recurring events instances (greater than or equal to right now)
    await prisma.booking.updateMany({
      where: {
        recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
      },
    });
    const allUpdatedBookings = await prisma.booking.findMany({
      where: {
        recurringEventId: bookingToDelete.recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
      select: {
        startTime: true,
        endTime: true,
        references: {
          select: {
            uid: true,
            type: true,
            externalCalendarId: true,
            credentialId: true,
          },
        },
        workflowReminders: true,
        uid: true,
        scheduledJobs: true,
      },
    });
    updatedBookings = updatedBookings.concat(allUpdatedBookings);
  } else {
    if (bookingToDelete?.eventType?.seatsPerTimeSlot) {
      await prisma.attendee.deleteMany({
        where: {
          bookingId: bookingToDelete.id,
        },
      });
    }

    const where: Prisma.BookingWhereUniqueInput = uid ? { uid } : { id };

    const updatedBooking = await prisma.booking.update({
      where,
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
        // Assume that canceling the booking is the last action
        iCalSequence: evt.iCalSequence || 100,
      },
      select: {
        startTime: true,
        endTime: true,
        references: {
          select: {
            uid: true,
            type: true,
            externalCalendarId: true,
            credentialId: true,
          },
        },
        workflowReminders: true,
        uid: true,
        scheduledJobs: true,
      },
    });
    updatedBookings.push(updatedBooking);
  }

  /** TODO: Remove this without breaking functionality */
  if (bookingToDelete.location === DailyLocationType) {
    bookingToDelete.user.credentials.push({
      ...FAKE_DAILY_CREDENTIAL,
      teamId: bookingToDelete.eventType?.team?.id || null,
    });
  }

  const apiDeletes = [];

  const bookingCalendarReference = bookingToDelete.references.filter((reference) =>
    reference.type.includes("_calendar")
  );

  if (bookingCalendarReference.length > 0) {
    for (const reference of bookingCalendarReference) {
      const { credentialId, uid, externalCalendarId } = reference;
      // If the booking calendar reference contains a credentialId
      if (credentialId) {
        // Find the correct calendar credential under user credentials
        let calendarCredential = bookingToDelete.user.credentials.find(
          (credential) => credential.id === credentialId
        );
        if (!calendarCredential) {
          // get credential from DB
          const foundCalendarCredential = await prisma.credential.findUnique({
            where: {
              id: credentialId,
            },
            select: credentialForCalendarServiceSelect,
          });
          if (foundCalendarCredential) {
            calendarCredential = foundCalendarCredential;
          }
        }
        if (calendarCredential) {
          const calendar = await getCalendar(calendarCredential);
          if (
            bookingToDelete.eventType?.recurringEvent &&
            bookingToDelete.recurringEventId &&
            allRemainingBookings
          ) {
            const promises = bookingToDelete.user.credentials
              .filter((credential) => credential.type.endsWith("_calendar"))
              .map(async (credential) => {
                const calendar = await getCalendar(credential);
                for (const updBooking of updatedBookings) {
                  const bookingRef = updBooking.references.find((ref) => ref.type.includes("_calendar"));
                  if (bookingRef) {
                    const { uid, externalCalendarId } = bookingRef;
                    const deletedEvent = await calendar?.deleteEvent(uid, evt, externalCalendarId);
                    apiDeletes.push(deletedEvent);
                  }
                }
              });
            try {
              await Promise.all(promises);
            } catch (error) {
              if (error instanceof Error) {
                logger.error(error.message);
              }
            }
          } else {
            apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
          }
        }
      } else {
        // For bookings made before the refactor we go through the old behavior of running through each calendar credential
        const calendarCredentials = bookingToDelete.user.credentials.filter((credential) =>
          credential.type.endsWith("_calendar")
        );
        for (const credential of calendarCredentials) {
          const calendar = await getCalendar(credential);
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
        }
      }
    }
  }

  const bookingVideoReference = bookingToDelete.references.find((reference) =>
    reference.type.includes("_video")
  );

  // If the video reference has a credentialId find the specific credential
  if (bookingVideoReference && bookingVideoReference.credentialId) {
    const { credentialId, uid } = bookingVideoReference;
    if (credentialId) {
      const videoCredential = bookingToDelete.user.credentials.find(
        (credential) => credential.id === credentialId
      );

      if (videoCredential) {
        logger.debug("videoCredential inside cancel booking handler", videoCredential);
        apiDeletes.push(deleteMeeting(videoCredential, uid));
      }
    }
  }

  // Avoiding taking care of recurrence for now as Payments are not supported with Recurring Events at the moment
  if (bookingToDelete && bookingToDelete.paid) {
    const evt: CalendarEvent = {
      type: bookingToDelete?.eventType?.slug as string,
      title: bookingToDelete.title,
      description: bookingToDelete.description ?? "",
      customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
      ...getCalEventResponses({
        booking: bookingToDelete,
        bookingFields: bookingToDelete.eventType?.bookingFields ?? null,
      }),
      startTime: bookingToDelete.startTime.toISOString(),
      endTime: bookingToDelete.endTime.toISOString(),
      organizer: {
        email: bookingToDelete.user?.email ?? "dev@calendso.com",
        name: bookingToDelete.user?.name ?? "no user",
        timeZone: bookingToDelete.user?.timeZone ?? "",
        timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      location: bookingToDelete.location ?? "",
      uid: bookingToDelete.uid ?? "",
      destinationCalendar: bookingToDelete?.destinationCalendar
        ? [bookingToDelete?.destinationCalendar]
        : bookingToDelete?.user.destinationCalendar
        ? [bookingToDelete?.user.destinationCalendar]
        : [],
    };

    const successPayment = bookingToDelete.payment.find((payment) => payment.success);
    if (!successPayment?.externalId) {
      throw new Error("Cannot reject a booking without a successful payment");
    }

    let eventTypeOwnerId;
    if (bookingToDelete.eventType?.owner) {
      eventTypeOwnerId = bookingToDelete.eventType.owner.id;
    } else if (bookingToDelete.eventType?.team?.id) {
      const teamOwner = await prisma.membership.findFirst({
        where: {
          teamId: bookingToDelete.eventType?.team.id,
          role: MembershipRole.OWNER,
        },
        select: {
          userId: true,
        },
      });
      eventTypeOwnerId = teamOwner?.userId;
    }

    if (!eventTypeOwnerId) {
      throw new Error("Event Type owner not found for obtaining payment app credentials");
    }

    const paymentAppCredentials = await prisma.credential.findMany({
      where: {
        userId: eventTypeOwnerId,
        appId: successPayment.appId,
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

    const paymentAppCredential = paymentAppCredentials.find((credential) => {
      return credential.appId === successPayment.appId;
    });

    if (!paymentAppCredential) {
      throw new Error("Payment app credentials not found");
    }

    // Posible to refactor TODO:
    const paymentApp = (await appStore[
      paymentAppCredential?.app?.dirName as keyof typeof appStore
    ]()) as PaymentApp;
    if (!paymentApp?.lib?.PaymentService) {
      console.warn(`payment App service of type ${paymentApp} is not implemented`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PaymentService = paymentApp.lib.PaymentService as unknown as any;
    const paymentInstance = new PaymentService(paymentAppCredential) as IAbstractPaymentService;

    try {
      await paymentInstance.refund(successPayment.id);
    } catch (error) {
      await handleRefundError({
        event: evt,
        reason: error?.toString() || "unknown",
        paymentId: successPayment.externalId,
      });
    }

    await prisma.booking.update({
      where: {
        id: bookingToDelete.id,
      },
      data: {
        status: BookingStatus.REJECTED,
      },
    });

    // We skip the deletion of the event, because that would also delete the payment reference, which we should keep
    try {
      await apiDeletes;
    } catch (error) {
      console.error("Error deleting event", error);
    }
    req.statusCode = 200;
    return { message: "Booking successfully cancelled." };
  }

  const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });

  // delete scheduled jobs of cancelled bookings
  // FIXME: async calls into ether
  updatedBookings.forEach((booking) => {
    cancelScheduledJobs(booking);
  });

  //Workflows - cancel all reminders for cancelled bookings
  // FIXME: async calls into ether
  updatedBookings.forEach((booking) => {
    booking.workflowReminders.forEach((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.WHATSAPP) {
        deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
      }
    });
  });

  const prismaPromises: Promise<unknown>[] = [bookingReferenceDeletes];

  try {
    const settled = await Promise.allSettled(prismaPromises.concat(apiDeletes));
    const rejected = settled.filter(({ status }) => status === "rejected") as PromiseRejectedResult[];
    if (rejected.length) {
      throw new Error(`Reasons: ${rejected.map(({ reason }) => reason)}`);
    }

    // TODO: if emails fail try to requeue them
    await sendCancelledEmails(evt, { eventName: bookingToDelete?.eventType?.eventName });
  } catch (error) {
    console.error("Error deleting event", error);
  }
  req.statusCode = 200;
  return { message: "Booking successfully cancelled." };
}

async function handleSeatedEventCancellation(
  req: CustomRequest,
  dataForWebhooks: {
    webhooks: {
      id: string;
      subscriberUrl: string;
      payloadTemplate: string | null;
      appId: string | null;
      secret: string | null;
    }[];
    evt: CalendarEvent;
    eventTypeInfo: EventTypeInfo;
  }
) {
  const { seatReferenceUid } = schemaBookingCancelParams.parse(req.body);
  const { webhooks, evt, eventTypeInfo } = dataForWebhooks;
  if (!seatReferenceUid) return;
  const bookingToDelete = req.bookingToDelete;
  if (!bookingToDelete?.attendees.length || bookingToDelete.attendees.length < 2) return;

  if (!bookingToDelete.userId) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  const seatReference = bookingToDelete.seatsReferences.find(
    (reference) => reference.referenceUid === seatReferenceUid
  );

  if (!seatReference) throw new HttpError({ statusCode: 400, message: "User not a part of this booking" });

  await Promise.all([
    prisma.bookingSeat.delete({
      where: {
        referenceUid: seatReferenceUid,
      },
    }),
    prisma.attendee.delete({
      where: {
        id: seatReference.attendeeId,
      },
    }),
  ]);
  req.statusCode = 200;

  const attendee = bookingToDelete?.attendees.find((attendee) => attendee.id === seatReference.attendeeId);

  if (attendee) {
    /* If there are references then we should update them as well */

    const integrationsToUpdate = [];

    for (const reference of bookingToDelete.references) {
      if (reference.credentialId) {
        const credential = await prisma.credential.findUnique({
          where: {
            id: reference.credentialId,
          },
          select: credentialForCalendarServiceSelect,
        });

        if (credential) {
          const updatedEvt = {
            ...evt,
            attendees: evt.attendees.filter((evtAttendee) => attendee.email !== evtAttendee.email),
          };
          if (reference.type.includes("_video")) {
            integrationsToUpdate.push(updateMeeting(credential, updatedEvt, reference));
          }
          if (reference.type.includes("_calendar")) {
            const calendar = await getCalendar(credential);
            if (calendar) {
              integrationsToUpdate.push(
                calendar?.updateEvent(reference.uid, updatedEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    try {
      await Promise.all(integrationsToUpdate);
    } catch (error) {
      // Shouldn't stop code execution if integrations fail
      // as integrations was already updated
    }

    const tAttendees = await getTranslation(attendee.locale ?? "en", "common");

    await sendCancelledSeatEmails(evt, {
      ...attendee,
      language: { translate: tAttendees, locale: attendee.locale ?? "en" },
    });
  }

  evt.attendees = attendee
    ? [
        {
          ...attendee,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        },
      ]
    : [];

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, WebhookTriggerEvents.BOOKING_CANCELLED, new Date().toISOString(), webhook, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
    }).catch((e) => {
      console.error(
        `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CANCELLED}, URL: ${webhook.subscriberUrl}`,
        e
      );
    })
  );
  await Promise.all(promises);

  const workflowRemindersForAttendee = bookingToDelete?.workflowReminders.filter(
    (reminder) => reminder.seatReferenceId === seatReferenceUid
  );

  if (workflowRemindersForAttendee && workflowRemindersForAttendee.length !== 0) {
    const deletionPromises = workflowRemindersForAttendee.map((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        return deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        return deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.WHATSAPP) {
        return deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
      }
    });

    await Promise.allSettled(deletionPromises);
  }

  return { success: true };
}

export default handler;
