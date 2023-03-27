import type { PrismaClient, Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";
import { BookingStatus, WebhookTriggerEvents } from "@prisma/client";

import { scheduleTrigger } from "@calcom/app-store/zapier/lib/nodeScheduler";
import type { EventManagerUser } from "@calcom/core/EventManager";
import EventManager from "@calcom/core/EventManager";
import { sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

const log = logger.getChildLogger({ prefix: ["[handleConfirmation] book:user"] });

export async function handleConfirmation(args: {
  user: EventManagerUser & { username: string | null };
  evt: CalendarEvent;
  recurringEventId?: string;
  prisma: PrismaClient;
  bookingId: number;
  booking: {
    eventType: {
      currency: string;
      description: string | null;
      id: number;
      length: number;
      price: number;
      requiresConfirmation: boolean;
      title: string;
    } | null;
    eventTypeId: number | null;
    smsReminderNumber: string | null;
    userId: number | null;
  };
  paid?: boolean;
}) {
  const { user, evt, recurringEventId, prisma, bookingId, booking, paid } = args;
  const eventManager = new EventManager(user);
  const scheduleResult = await eventManager.create(evt);
  const results = scheduleResult.results;

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

  if (recurringEventId) {
    // The booking to confirm is a recurring event and comes from /booking/recurring, proceeding to mark all related
    // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
    const unconfirmedRecurringBookings = await prisma.booking.findMany({
      where: {
        recurringEventId,
        status: BookingStatus.PENDING,
      },
    });

    const updateBookingsPromise = unconfirmedRecurringBookings.map((recurringBooking) =>
      prisma.booking.update({
        where: {
          id: recurringBooking.id,
        },
        data: {
          status: BookingStatus.ACCEPTED,
          references: {
            create: scheduleResult.referencesToCreate,
          },
          paid,
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
      })
    );
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
    const subscribersBookingCreated = await getWebhooks({
      userId: booking.userId || 0,
      eventTypeId: booking.eventTypeId || 0,
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
    });
    const subscribersMeetingEnded = await getWebhooks({
      userId: booking.userId || 0,
      eventTypeId: booking.eventTypeId || 0,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
    });

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
}
