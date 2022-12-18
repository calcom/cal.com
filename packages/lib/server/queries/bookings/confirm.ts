import {
  Prisma,
  BookingStatus,
  DestinationCalendar,
  PrismaClient,
  SchedulingType,
  Credential,
  WorkflowsOnEventTypes,
  WorkflowStep,
  Workflow,
  WebhookTriggerEvents,
} from "@prisma/client";

import { refund } from "@calcom/app-store/stripepayment/lib/server";
import { scheduleTrigger } from "@calcom/app-store/zapier/lib/nodeScheduler";
import EventManager from "@calcom/core/EventManager";
import { sendDeclinedEmails, sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload, { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { TRPCError } from "@calcom/trpc/server";
import { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

import { isPrismaObjOrUndefined } from "../../../isPrismaObj";
import { parseRecurringEvent } from "../../../isRecurringEvent";
import logger from "../../../logger";
import { getTranslation } from "../../i18n";

type ProcessBookingConfirmationProps = {
  user: {
    id: number;
    email: string;
    name: string | null;
    timeZone: string;
    locale: string | null;
    destinationCalendar: DestinationCalendar | null;
    credentials: Credential[];
    username: string | null;
  };
  bookingId: number;
  recurringEventId?: string | null;
  confirmed: boolean;
  rejectionReason?: string;
};

export async function processBookingConfirmation(
  { user, bookingId, recurringEventId, confirmed, rejectionReason }: ProcessBookingConfirmationProps,
  prisma: PrismaClient
) {
  const log = logger.getChildLogger({ prefix: ["[lib] queries:bookings:confirm"] });
  const tOrganizer = await getTranslation(user.locale ?? "en", "common");
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
    },
    rejectOnNotFound() {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    },
    // should trpc handle this error  ?
    select: {
      title: true,
      description: true,
      customInputs: true,
      startTime: true,
      endTime: true,
      attendees: true,
      eventTypeId: true,
      eventType: {
        select: {
          id: true,
          recurringEvent: true,
          title: true,
          requiresConfirmation: true,
          currency: true,
          length: true,
          description: true,
          price: true,
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
      location: true,
      userId: true,
      id: true,
      uid: true,
      payment: true,
      destinationCalendar: true,
      paid: true,
      recurringEventId: true,
      status: true,
      smsReminderNumber: true,
      scheduledJobs: true,
    },
  });
  const authorized = async () => {
    // if the organizer
    if (booking.userId === user.id) {
      return true;
    }
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: booking.eventTypeId || undefined,
      },
      select: {
        id: true,
        schedulingType: true,
        users: true,
      },
    });
    if (
      eventType?.schedulingType === SchedulingType.COLLECTIVE &&
      eventType.users.find((user) => user.id === user.id)
    ) {
      return true;
    }
    return false;
  };

  if (!(await authorized())) throw new TRPCError({ code: "UNAUTHORIZED", message: "UNAUTHORIZED" });

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Booking already confirmed" });

  /** When a booking that requires payment its being confirmed but doesn't have any payment,
   * we shouldn’t save it on DestinationCalendars
   */
  if (booking.payment.length > 0 && !booking.paid) {
    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.ACCEPTED,
      },
    });

    return { message: "Booking confirmed", status: BookingStatus.ACCEPTED };
  }
  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);

  const evt: CalendarEvent = {
    type: booking.eventType?.title || booking.title,
    title: booking.title,
    description: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: user.email,
      name: user.name || "Unnamed",
      timeZone: user.timeZone,
      language: { translate: tOrganizer, locale: user.locale ?? "en" },
    },
    attendees: attendeesList,
    location: booking.location ?? "",
    uid: booking.uid,
    destinationCalendar: booking?.destinationCalendar || user.destinationCalendar,
    requiresConfirmation: booking?.eventType?.requiresConfirmation ?? false,
    eventTypeId: booking.eventType?.id,
  };

  const recurringEvent = parseRecurringEvent(booking.eventType?.recurringEvent);
  if (recurringEventId && recurringEvent) {
    const groupedRecurringBookings = await prisma.booking.groupBy({
      where: {
        recurringEventId: booking.recurringEventId,
      },
      by: [Prisma.BookingScalarFieldEnum.recurringEventId],
      _count: true,
    });
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    recurringEvent.count = groupedRecurringBookings[0]._count;
    // count changed, parsing again to get the new value in
    evt.recurringEvent = parseRecurringEvent(recurringEvent);
  }
  let videoCallUrl;

  if (confirmed) {
    const eventManager = new EventManager(user);
    const scheduleResult = await eventManager.create(evt);

    const results = scheduleResult.results;

    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      log.error(`Booking ${user.username} failed`, error, results);
    } else {
      const metadata: AdditionalInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
        videoCallUrl = metadata.hangoutLink || videoCallUrl;
      }
      try {
        await sendScheduledEmails({ ...evt, additionalInformation: metadata });
      } catch (error) {
        log.error(error);
      }
    }
    let updatedBookings: {
      scheduledJobs: string[];
      id: number;
      startTime: Date;
      endTime: Date;
      uid: string;
      smsReminderNumber: string | null;
      eventType: {
        workflows: (WorkflowsOnEventTypes & {
          workflow: Workflow & {
            steps: WorkflowStep[];
          };
        })[];
      } | null;
    }[] = [];
    const metadata = videoCallUrl ? { videoCallUrl } : undefined;

    if (recurringEventId) {
      // The booking to confirm is a recurring event and comes from /booking/recurring, proceeding to mark all related
      // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
      const unconfirmedRecurringBookings = await prisma.booking.findMany({
        where: {
          recurringEventId,
          status: BookingStatus.PENDING,
        },
      });

      const updateBookingsPromise = unconfirmedRecurringBookings.map((recurringBooking) => {
        return prisma.booking.update({
          where: {
            id: recurringBooking.id,
          },
          data: {
            status: BookingStatus.ACCEPTED,
            metadata,
            references: {
              create: scheduleResult.referencesToCreate,
            },
          },
          select: {
            eventType: {
              select: {
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
            startTime: true,
            endTime: true,
            smsReminderNumber: true,
            id: true,
            scheduledJobs: true,
          },
        });
      });
      const updatedBookingsResult = await Promise.all(updateBookingsPromise);
      updatedBookings = updatedBookings.concat(updatedBookingsResult);
    } else {
      // @NOTE: be careful with this as if any error occurs before this booking doesn't get confirmed
      // Should perform update on booking (confirm) -> then trigger the rest handlers
      const updatedBooking = await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.ACCEPTED,
          metadata,
          references: {
            create: scheduleResult.referencesToCreate,
          },
        },
        select: {
          eventType: {
            select: {
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
          startTime: true,
          endTime: true,
          smsReminderNumber: true,
          id: true,
          scheduledJobs: true,
        },
      });
      updatedBookings.push(updatedBooking);
    }

    //Workflows - set reminders for confirmed events
    try {
      for (let index = 0; index < updatedBookings.length; index++) {
        if (updatedBookings[index].eventType?.workflows) {
          const evtOfBooking = evt;
          evtOfBooking.startTime = updatedBookings[index].startTime.toISOString();
          evtOfBooking.endTime = updatedBookings[index].endTime.toISOString();
          evtOfBooking.uid = updatedBookings[index].uid;

          const isFirstBooking = index === 0;

          await scheduleWorkflowReminders(
            updatedBookings[index]?.eventType?.workflows || [],
            updatedBookings[index].smsReminderNumber,
            evtOfBooking,
            false,
            false,
            isFirstBooking
          );
        }
      }
    } catch (error) {
      // Silently fail
      console.error(error);
    }

    try {
      // schedule job for zapier trigger 'when meeting ends'
      const subscriberOptionsMeetingEnded = {
        userId: booking.userId || 0,
        eventTypeId: booking.eventTypeId || 0,
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      };

      const subscriberOptionsBookingCreated = {
        userId: booking.userId || 0,
        eventTypeId: booking.eventTypeId || 0,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      };

      const subscribersBookingCreated = await getWebhooks(subscriberOptionsBookingCreated);

      const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);

      subscribersMeetingEnded.forEach((subscriber) => {
        updatedBookings.forEach((booking) => {
          scheduleTrigger(booking, subscriber.subscriberUrl, subscriber);
        });
      });

      const eventTypeInfo: EventTypeInfo = {
        eventTitle: booking.eventType?.title,
        eventDescription: booking.eventType?.description,
        requiresConfirmation: booking.eventType?.requiresConfirmation || null,
        price: booking.eventType?.price,
        currency: booking.eventType?.currency,
        length: booking.eventType?.length,
      };

      const promises = subscribersBookingCreated.map((sub) =>
        sendPayload(sub.secret, WebhookTriggerEvents.BOOKING_CREATED, new Date().toISOString(), sub, {
          ...evt,
          ...eventTypeInfo,
          bookingId,
          eventTypeId: booking.eventType?.id,
          status: "ACCEPTED",
          smsReminderNumber: booking.smsReminderNumber || undefined,
        }).catch((e) => {
          console.error(
            `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CREATED}, URL: ${sub.subscriberUrl}`,
            e
          );
        })
      );
      await Promise.all(promises);
    } catch (error) {
      // Silently fail
      console.error(error);
    }
  } else {
    evt.rejectionReason = rejectionReason;
    if (recurringEventId) {
      // The booking to reject is a recurring event and comes from /booking/upcoming, proceeding to mark all related
      // bookings as rejected.
      await prisma.booking.updateMany({
        where: {
          recurringEventId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    } else {
      await refund(booking, evt); // No payment integration for recurring events for v1
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    }

    await sendDeclinedEmails(evt);
  }

  const message = "Booking " + confirmed ? "confirmed" : "rejected";
  const status = confirmed ? BookingStatus.ACCEPTED : BookingStatus.REJECTED;

  return { message, status };
}
