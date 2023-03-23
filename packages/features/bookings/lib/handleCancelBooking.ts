import type { WebhookTriggerEvents, WorkflowReminder, Prisma } from "@prisma/client";
import { BookingStatus, MembershipRole, WorkflowMethods } from "@prisma/client";
import type { NextApiRequest } from "next";

import appStore from "@calcom/app-store";
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { DailyLocationType } from "@calcom/app-store/locations";
import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import { deleteMeeting, updateMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmails, sendCancelledSeatEmails } from "@calcom/emails";
import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { HttpError } from "@calcom/lib/http-error";
import { handleRefundError } from "@calcom/lib/payment/handleRefundError";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

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
          credentials: true,
          email: true,
          timeZone: true,
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
          owner: true,
          teamId: true,
          recurringEvent: true,
          title: true,
          description: true,
          requiresConfirmation: true,
          price: true,
          currency: true,
          length: true,
          seatsPerTimeSlot: true,
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
        },
      },
      uid: true,
      eventTypeId: true,
      destinationCalendar: true,
      smsReminderNumber: true,
      workflowReminders: true,
      scheduledJobs: true,
      seatsReferences: true,
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

  if (userId !== bookingToDelete.user?.id && bookingToDelete.startTime < new Date()) {
    throw new HttpError({ statusCode: 400, message: "Cannot cancel past events" });
  }

  if (!bookingToDelete.userId) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  // If it's just an attendee of a booking then just remove them from that booking
  const result = await handleSeatedEventCancellation(req);
  if (result) return { success: true };

  const organizer = await prisma.user.findFirstOrThrow({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
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
    type: (bookingToDelete?.eventType?.title as string) || bookingToDelete?.title,
    description: bookingToDelete?.description || "",
    customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      email: organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: bookingToDelete?.uid,
    /* Include recurringEvent information only when cancelling all bookings */
    recurringEvent: allRemainingBookings
      ? parseRecurringEvent(bookingToDelete.eventType?.recurringEvent)
      : undefined,
    location: bookingToDelete?.location,
    destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
    cancellationReason: cancellationReason,
    ...(teamMembers && { team: { name: "", members: teamMembers } }),
  };

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

    /* If there are references then we should update them as well */
    const lastAttendee =
      bookingToDelete.attendees.filter((bookingAttendee) => attendee.email !== bookingAttendee.email).length <
      0;

    const integrationsToDelete = [];

    for (const reference of bookingToDelete.references) {
      if (reference.credentialId) {
        const credential = await prisma.credential.findUnique({
          where: {
            id: reference.credentialId,
          },
        });

        if (credential) {
          if (lastAttendee) {
            if (reference.type.includes("_video")) {
              integrationsToDelete.push(deleteMeeting(credential, reference.uid));
            }
            if (reference.type.includes("_calendar")) {
              const calendar = getCalendar(credential);
              if (calendar) {
                integrationsToDelete.push(
                  calendar?.deleteEvent(reference.uid, evt, reference.externalCalendarId)
                );
              }
            }
          } else {
            const updatedEvt = {
              ...evt,
              attendees: evt.attendees.filter((evtAttendee) => attendee.email !== evtAttendee.email),
            };
            if (reference.type.includes("_video")) {
              integrationsToDelete.push(
                updateMeeting(
                  { ...credential, appName: evt.location?.replace("integrations:", "") || "" },
                  updatedEvt,
                  reference
                )
              );
            }
            if (reference.type.includes("_calendar")) {
              const calendar = getCalendar(credential);
              if (calendar) {
                integrationsToDelete.push(
                  calendar?.updateEvent(reference.uid, updatedEvt, reference.externalCalendarId)
                );
              }
            }
          }
        }
      }
    }

    await Promise.all(integrationsToDelete).then(async () => {
      if (lastAttendee) {
        await prisma.booking.update({
          where: {
            id: bookingToDelete.id,
          },
          data: {
            status: BookingStatus.CANCELLED,
          },
        });
      }
    });

    const tAttendees = await getTranslation(attendee.locale ?? "en", "common");

    await sendCancelledSeatEmails(evt, {
      ...attendee,
      language: { translate: tAttendees, locale: attendee.locale ?? "en" },
    });

    req.statusCode = 200;
    return { message: "No longer attending event" };
  }

  // Hook up the webhook logic here
  const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";
  // Send Webhook call if hooked to BOOKING.CANCELLED
  const subscriberOptions = {
    userId: bookingToDelete.userId,
    eventTypeId: (bookingToDelete.eventTypeId as number) || 0,
    triggerEvent: eventTrigger,
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
    await sendCancelledReminders(
      bookingToDelete.eventType?.workflows,
      bookingToDelete.smsReminderNumber,
      evt
    );
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
    bookingToDelete.user.credentials.push(FAKE_DAILY_CREDENTIAL);
  }

  const apiDeletes = [];

  const bookingCalendarReference = bookingToDelete.references.find((reference) =>
    reference.type.includes("_calendar")
  );

  if (bookingCalendarReference) {
    const { credentialId, uid, externalCalendarId } = bookingCalendarReference;
    // If the booking calendar reference contains a credentialId
    if (credentialId) {
      // Find the correct calendar credential under user credentials
      const calendarCredential = bookingToDelete.user.credentials.find(
        (credential) => credential.id === credentialId
      );
      if (calendarCredential) {
        const calendar = getCalendar(calendarCredential);
        if (
          bookingToDelete.eventType?.recurringEvent &&
          bookingToDelete.recurringEventId &&
          allRemainingBookings
        ) {
          bookingToDelete.user.credentials
            .filter((credential) => credential.type.endsWith("_calendar"))
            .forEach(async (credential) => {
              const calendar = getCalendar(credential);
              for (const updBooking of updatedBookings) {
                const bookingRef = updBooking.references.find((ref) => ref.type.includes("_calendar"));
                if (bookingRef) {
                  const { uid, externalCalendarId } = bookingRef;
                  const deletedEvent = await calendar?.deleteEvent(uid, evt, externalCalendarId);
                  apiDeletes.push(deletedEvent);
                }
              }
            });
        } else {
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
        }
      }
    } else {
      // For bookings made before the refactor we go through the old behaviour of running through each calendar credential
      bookingToDelete.user.credentials
        .filter((credential) => credential.type.endsWith("_calendar"))
        .forEach((credential) => {
          const calendar = getCalendar(credential);
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
        });
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
        apiDeletes.push(deleteMeeting(videoCredential, uid));
      }
    }
    // For bookings made before this refactor we go through the old behaviour of running through each video credential
  } else {
    bookingToDelete.user.credentials
      .filter((credential) => credential.type.endsWith("_video"))
      .forEach((credential) => {
        const uidToDelete = bookingToDelete?.references?.[0].uid ?? bookingToDelete.uid;
        apiDeletes.push(deleteMeeting(credential, uidToDelete));
      });
  }

  // Avoiding taking care of recurrence for now as Payments are not supported with Recurring Events at the moment
  if (bookingToDelete && bookingToDelete.paid) {
    const evt: CalendarEvent = {
      type: bookingToDelete?.eventType?.title as string,
      title: bookingToDelete.title,
      description: bookingToDelete.description ?? "",
      customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
      startTime: bookingToDelete.startTime.toISOString(),
      endTime: bookingToDelete.endTime.toISOString(),
      organizer: {
        email: bookingToDelete.user?.email ?? "dev@calendso.com",
        name: bookingToDelete.user?.name ?? "no user",
        timeZone: bookingToDelete.user?.timeZone ?? "",
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      location: bookingToDelete.location ?? "",
      uid: bookingToDelete.uid ?? "",
      destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
    };

    const successPayment = bookingToDelete.payment.find((payment) => payment.success);
    if (!successPayment) {
      throw new Error("Cannot reject a booking without a successful payment");
    }

    let eventTypeOwnerId;
    if (bookingToDelete.eventType?.owner) {
      eventTypeOwnerId = bookingToDelete.eventType.owner.id;
    } else if (bookingToDelete.eventType?.teamId) {
      const teamOwner = await prisma.membership.findFirst({
        where: {
          teamId: bookingToDelete.eventType.teamId,
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
    const paymentApp = appStore[paymentAppCredential?.app?.dirName as keyof typeof appStore];
    if (!(paymentApp && "lib" in paymentApp && "PaymentService" in paymentApp.lib)) {
      console.warn(`payment App service of type ${paymentApp} is not implemented`);
      return null;
    }

    const PaymentService = paymentApp.lib.PaymentService;
    const paymentInstance = new PaymentService(paymentAppCredential);
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
    await apiDeletes;
    req.statusCode = 200;
    return { message: "Booking successfully cancelled." };
  }

  const attendeeDeletes = prisma.attendee.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });

  const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });

  // delete scheduled jobs of cancelled bookings
  updatedBookings.forEach((booking) => {
    cancelScheduledJobs(booking);
  });

  //Workflows - cancel all reminders for cancelled bookings
  updatedBookings.forEach((booking) => {
    booking.workflowReminders.forEach((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      }
    });
  });

  const prismaPromises: Promise<unknown>[] = [attendeeDeletes, bookingReferenceDeletes];

  await Promise.all(prismaPromises.concat(apiDeletes));

  await sendCancelledEmails(evt);

  req.statusCode = 200;
  return { message: "Booking successfully cancelled." };
}

async function handleSeatedEventCancellation(req: CustomRequest) {
  const { seatReferenceUid } = schemaBookingCancelParams.parse(req.body);
  if (!seatReferenceUid) return;
  if (!req.bookingToDelete?.attendees.length || req.bookingToDelete.attendees.length < 2) return;

  const seatReference = req.bookingToDelete.seatsReferences.find(
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
  return { success: true };
}

export default handler;
