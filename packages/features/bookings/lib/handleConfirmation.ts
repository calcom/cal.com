import type { Prisma, PrismaClient, Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import { scheduleTrigger } from "@calcom/app-store/zapier/lib/nodeScheduler";
import type { EventManagerUser } from "@calcom/core/EventManager";
import EventManager from "@calcom/core/EventManager";
import { sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
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
      teamId?: number | null;
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
    description: string | null;
    location: string | null;
    attendees: {
      name: string;
      email: string;
    }[];
    startTime: Date;
    endTime: Date;
    uid: string;
    smsReminderNumber: string | null;
    metadata: Prisma.JsonValue | null;
    customInputs: Prisma.JsonValue;
    eventType: {
      bookingFields: Prisma.JsonValue | null;
      slug: string;
      owner: {
        hideBranding?: boolean | null;
      } | null;
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
              slug: true,
              bookingFields: true,
              owner: {
                select: {
                  hideBranding: true,
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
          description: true,
          attendees: true,
          location: true,
          uid: true,
          startTime: true,
          metadata: true,
          endTime: true,
          smsReminderNumber: true,
          customInputs: true,
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
            slug: true,
            bookingFields: true,
            owner: {
              select: {
                hideBranding: true,
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
        startTime: true,
        metadata: true,
        endTime: true,
        smsReminderNumber: true,
        description: true,
        attendees: true,
        location: true,
        customInputs: true,
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
        const eventTypeSlug = updatedBookings[index].eventType?.slug || "";

        const isFirstBooking = index === 0;
        const videoCallUrl =
          bookingMetadataSchema.parse(updatedBookings[index].metadata || {})?.videoCallUrl || "";

        await scheduleWorkflowReminders({
          workflows: updatedBookings[index]?.eventType?.workflows || [],
          smsReminderNumber: updatedBookings[index].smsReminderNumber,
          calendarEvent: {
            ...evtOfBooking,
            ...{ metadata: { videoCallUrl }, eventType: { slug: eventTypeSlug } },
          },
          isFirstRecurringEvent: isFirstBooking,
          hideBranding: !!updatedBookings[index].eventType?.owner?.hideBranding,
        });
      }
    }
  } catch (error) {
    // Silently fail
    console.error(error);
  }

  try {
    const subscribersBookingCreated = await getWebhooks({
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      teamId: booking.eventType?.teamId,
    });
    const subscribersMeetingEnded = await getWebhooks({
      userId: booking.userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: booking.eventType?.teamId,
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
