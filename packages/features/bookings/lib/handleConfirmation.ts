import type { Prisma, Workflow, WorkflowsOnEventTypes, WorkflowStep } from "@prisma/client";

import type { EventManagerUser } from "@calcom/core/EventManager";
import EventManager from "@calcom/core/EventManager";
import { scheduleMandatoryReminder } from "@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder";
import { sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "../../ee/workflows/lib/allowDisablingStandardEmails";

const log = logger.getSubLogger({ prefix: ["[handleConfirmation] book:user"] });

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
      metadata?: Prisma.JsonValue;
      title: string;
      team?: {
        parentId: number | null;
      } | null;
      teamId?: number | null;
      parentId?: number | null;
      workflows?: {
        workflow: Workflow & {
          steps: WorkflowStep[];
        };
      }[];
    } | null;
    metadata?: Prisma.JsonValue;
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
  const metadata: AdditionalInformation = {};

  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingCreatingMeetingFailed",
      message: "Booking failed",
    };

    log.error(`Booking ${user.username} failed`, safeStringify({ error, results }));
  } else {
    if (results.length) {
      // TODO: Handle created event metadata more elegantly
      metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
      metadata.conferenceData = results[0].createdEvent?.conferenceData;
      metadata.entryPoints = results[0].createdEvent?.entryPoints;
    }
    try {
      const eventType = booking.eventType;
      const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});
      let isHostConfirmationEmailsDisabled = false;
      let isAttendeeConfirmationEmailDisabled = false;

      const workflows = eventType?.workflows?.map((workflow) => workflow.workflow);

      if (workflows) {
        isHostConfirmationEmailsDisabled =
          eventTypeMetadata?.disableStandardEmails?.confirmation?.host || false;
        isAttendeeConfirmationEmailDisabled =
          eventTypeMetadata?.disableStandardEmails?.confirmation?.attendee || false;

        if (isHostConfirmationEmailsDisabled) {
          isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
        }

        if (isAttendeeConfirmationEmailDisabled) {
          isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
        }
      }

      await sendScheduledEmails(
        { ...evt, additionalInformation: metadata },
        undefined,
        isHostConfirmationEmailsDisabled,
        isAttendeeConfirmationEmailDisabled
      );
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

  const videoCallUrl = metadata.hangoutLink ? metadata.hangoutLink : evt.videoCallData?.url || "";
  const meetingUrl = getVideoCallUrlFromCalEvent(evt) || videoCallUrl;

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
          metadata: {
            ...(typeof recurringBooking.metadata === "object" ? recurringBooking.metadata : {}),
            videoCallUrl: meetingUrl,
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
        metadata: {
          ...(typeof booking.metadata === "object" ? booking.metadata : {}),
          videoCallUrl: meetingUrl,
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
      const eventTypeSlug = updatedBookings[index].eventType?.slug || "";
      const evtOfBooking = {
        ...evt,
        metadata: { videoCallUrl: meetingUrl },
        eventType: { slug: eventTypeSlug },
      };
      evtOfBooking.startTime = updatedBookings[index].startTime.toISOString();
      evtOfBooking.endTime = updatedBookings[index].endTime.toISOString();
      evtOfBooking.uid = updatedBookings[index].uid;
      const isFirstBooking = index === 0;
      await scheduleMandatoryReminder(
        evtOfBooking,
        updatedBookings[index]?.eventType?.workflows || [],
        false,
        !!updatedBookings[index].eventType?.owner?.hideBranding,
        evt.attendeeSeatId
      );
      await scheduleWorkflowReminders({
        workflows: updatedBookings[index]?.eventType?.workflows || [],
        smsReminderNumber: updatedBookings[index].smsReminderNumber,
        calendarEvent: evtOfBooking,
        isFirstRecurringEvent: isFirstBooking,
        hideBranding: !!updatedBookings[index].eventType?.owner?.hideBranding,
      });
    }
  } catch (error) {
    // Silently fail
    console.error(error);
  }

  try {
    const teamId = await getTeamIdFromEventType({
      eventType: {
        team: { id: booking.eventType?.teamId ?? null },
        parentId: booking?.eventType?.parentId ?? null,
      },
    });

    const triggerForUser = !teamId || (teamId && booking.eventType?.parentId);

    const subscribersBookingCreated = await getWebhooks({
      userId: triggerForUser ? booking.userId : null,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      teamId,
    });
    const subscribersMeetingStarted = await getWebhooks({
      userId: triggerForUser ? booking.userId : null,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId: booking.eventType?.teamId,
    });
    const subscribersMeetingEnded = await getWebhooks({
      userId: triggerForUser ? booking.userId : null,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: booking.eventType?.teamId,
    });

    subscribersMeetingStarted.forEach((subscriber) => {
      updatedBookings.forEach((booking) => {
        scheduleTrigger(booking, subscriber.subscriberUrl, subscriber, WebhookTriggerEvents.MEETING_STARTED);
      });
    });
    subscribersMeetingEnded.forEach((subscriber) => {
      updatedBookings.forEach((booking) => {
        scheduleTrigger(booking, subscriber.subscriberUrl, subscriber, WebhookTriggerEvents.MEETING_ENDED);
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
        metadata: meetingUrl ? { videoCallUrl: meetingUrl } : undefined,
      }).catch((e) => {
        console.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CREATED}, URL: ${sub.subscriberUrl}`,
          e
        );
      })
    );

    await Promise.all(promises);

    if (paid) {
      let paymentExternalId: string | undefined;
      const subscriberMeetingPaid = await getWebhooks({
        userId: triggerForUser ? booking.userId : null,
        eventTypeId: booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
        teamId: booking.eventType?.teamId,
      });
      const bookingWithPayment = await prisma.booking.findFirst({
        where: {
          id: bookingId,
        },
        select: {
          payment: {
            select: {
              id: true,
              success: true,
              externalId: true,
            },
          },
        },
      });
      const successPayment = bookingWithPayment?.payment?.find((item) => item.success);
      if (successPayment) {
        paymentExternalId = successPayment.externalId;
      }

      const paymentMetadata = {
        identifier: "cal.com",
        bookingId,
        eventTypeId: booking.eventType?.id,
        bookerEmail: evt.attendees[0].email,
        eventTitle: booking.eventType?.title,
        externalId: paymentExternalId,
      };
      const bookingPaidSubscribers = subscriberMeetingPaid.map((sub) =>
        sendPayload(sub.secret, WebhookTriggerEvents.BOOKING_PAID, new Date().toISOString(), sub, {
          ...evt,
          ...eventTypeInfo,
          bookingId,
          eventTypeId: booking.eventType?.id,
          status: "ACCEPTED",
          smsReminderNumber: booking.smsReminderNumber || undefined,
          paymentId: bookingWithPayment?.payment?.[0].id,
          metadata: {
            ...(paid ? paymentMetadata : {}),
          },
        }).catch((e) => {
          console.error(
            `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_PAID}, URL: ${sub.subscriberUrl}`,
            e
          );
        })
      );

      // I don't need to await for this
      Promise.all(bookingPaidSubscribers);
    }
  } catch (error) {
    // Silently fail
    console.error(error);
  }
}
