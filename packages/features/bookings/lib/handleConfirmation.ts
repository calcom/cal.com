import type { CalIdWorkflowType } from "@calid/features/modules/workflows/config/types";
import {
  canDisableParticipantNotifications,
  canDisableOrganizerNotifications,
} from "@calid/features/modules/workflows/utils/notificationDisableCheck";
import { scheduleWorkflowReminders } from "@calid/features/modules/workflows/utils/reminderScheduler";
import { scheduleMandatoryReminder } from "@calid/features/modules/workflows/utils/scheduleMandatoryReminder";
import type { Prisma } from "@prisma/client";

import { sendScheduledEmailsAndSMS } from "@calcom/emails";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import type { EventManagerUser } from "@calcom/lib/EventManager";
import EventManager, { placeholderCreatedEvent } from "@calcom/lib/EventManager";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import type { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { PlatformClientParams } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema, eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { AdditionalInformation, CalendarEvent, RecurringEvent, Person } from "@calcom/types/Calendar";

import { getCalEventResponses } from "./getCalEventResponses";
import { scheduleNoShowTriggers } from "./handleNewBooking/scheduleNoShowTriggers";

const log = logger.getSubLogger({ prefix: ["[handleConfirmation] book:user"] });

export async function handleConfirmation(args: {
  user: EventManagerUser & { username: string | null };
  evt: CalendarEvent;
  recurringEventId?: string; // DEPRECATED: No longer used, kept for API compatibility
  prisma: PrismaClient;
  bookingId: number;
  booking: {
    startTime: Date;
    id: number;
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
      parent?: {
        teamId: number | null;
        calIdTeamId?: number | null;
      } | null;
      calIdWorkflows?: {
        workflow: CalIdWorkflowType;
      }[];
      calIdTeamId?: number | null;
    } | null;
    calIdTeamId?: number | null;
    metadata?: Prisma.JsonValue;
    eventTypeId: number | null;
    smsReminderNumber: string | null;
    userId: number | null;
    location: string | null;
  };
  paid?: boolean;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
  curAttendee?: Person;
}) {
  const {
    user,
    evt,
    recurringEventId, // DEPRECATED: Ignored in new implementation
    prisma,
    bookingId,
    booking,
    paid,
    emailsEnabled = true,
    platformClientParams,
  } = args;

  const eventType = booking.eventType;
  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});
  const apps = eventTypeAppMetadataOptionalSchema.parse(eventTypeMetadata?.apps);

  const bookingRecurringEvent = isPrismaObjOrUndefined(booking.metadata)?.recurringEvent as
    | RecurringEvent
    | undefined;
  const hasRecurringPattern = !!bookingRecurringEvent;

  // Add recurring event to calendar event if present
  if (hasRecurringPattern) {
    evt.recurringEvent = bookingRecurringEvent;
  }

  const eventManager = new EventManager(user, apps);
  const areCalendarEventsEnabled = platformClientParams?.areCalendarEventsEnabled ?? true;
  const scheduleResult = areCalendarEventsEnabled ? await eventManager.create(evt) : placeholderCreatedEvent;
  const results = scheduleResult.results;
  const metadata: AdditionalInformation = {};
  const workflows = await getAllWorkflowsFromEventType(eventType, booking.userId);

  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingCreatingMeetingFailed",
      message: "Booking failed",
    };

    log.error(`Booking ${user.username} failed`, safeStringify({ error, results }));
  } else {
    if (results.length) {
      metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
      metadata.conferenceData = results[0].createdEvent?.conferenceData;
      metadata.entryPoints = results[0].createdEvent?.entryPoints;
    }
    try {
      const eventType = booking.eventType;

      let isHostConfirmationEmailsDisabled = false;
      let isAttendeeConfirmationEmailDisabled = false;

      if (workflows) {
        isHostConfirmationEmailsDisabled =
          eventTypeMetadata?.disableStandardEmails?.confirmation?.host || false;
        isAttendeeConfirmationEmailDisabled =
          eventTypeMetadata?.disableStandardEmails?.confirmation?.attendee || false;

        if (isHostConfirmationEmailsDisabled) {
          isHostConfirmationEmailsDisabled = canDisableOrganizerNotifications(workflows);
        }

        if (isAttendeeConfirmationEmailDisabled) {
          isAttendeeConfirmationEmailDisabled = canDisableParticipantNotifications(workflows);
        }
      }

      if (emailsEnabled) {
        await sendScheduledEmailsAndSMS(
          { ...evt, additionalInformation: metadata },
          undefined,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled,
          eventTypeMetadata,
          args.curAttendee
        );
      }
    } catch (error) {
      log.error(error);
    }
  }

  const updatedBookings: {
    id: number;
    description: string | null;
    location: string | null;
    attendees: {
      name: string;
      email: string;
      phoneNumber?: string | null;
    }[];
    startTime: Date;
    endTime: Date;
    uid: string;
    smsReminderNumber: string | null;
    cancellationReason?: string | null;
    metadata: Prisma.JsonValue | null;
    customInputs: Prisma.JsonValue;
    title: string;
    responses: Prisma.JsonValue;
    eventType: {
      bookingFields: Prisma.JsonValue | null;
      slug: string;
      schedulingType: SchedulingType | null;
      hosts: {
        user: {
          email: string;
          destinationCalendar?: {
            primaryEmail: string | null;
          } | null;
        };
      }[];
      owner: {
        hideBranding?: boolean | null;
      } | null;
    } | null;
  }[] = [];

  const videoCallUrl = metadata.hangoutLink ? metadata.hangoutLink : evt.videoCallData?.url || "";
  const meetingUrl = getVideoCallUrlFromCalEvent(evt) || videoCallUrl;

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
          schedulingType: true,
          owner: {
            select: {
              hideBranding: true,
            },
          },
          hosts: {
            select: {
              user: {
                select: {
                  email: true,
                  destinationCalendar: {
                    select: {
                      primaryEmail: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      uid: true,
      startTime: true,
      responses: true,
      title: true,
      metadata: true,
      cancellationReason: true,
      endTime: true,
      smsReminderNumber: true,
      description: true,
      attendees: true,
      location: true,
      customInputs: true,
      id: true,
    },
  });

  updatedBookings.push(updatedBooking);

  const teamId = await getTeamIdFromEventType({
    eventType: {
      calIdTeam: { id: eventType?.calIdTeamId ?? null },
      parentId: eventType?.parentId ?? null,
    },
  });

  const triggerForUser = !teamId || (teamId && eventType?.parentId);

  const userId = triggerForUser ? booking.userId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const bookerUrl = await getBookerBaseUrl(orgId ?? null);

  // Workflows - set reminders for confirmed events
  try {
    for (let index = 0; index < updatedBookings.length; index++) {
      const eventTypeSlug = updatedBookings[index].eventType?.slug || "";
      const evtOfBooking = {
        ...evt,
        rescheduleReason: updatedBookings[index].cancellationReason || null,
        metadata: { videoCallUrl: meetingUrl },
        eventType: {
          slug: eventTypeSlug,
          schedulingType: updatedBookings[index].eventType?.schedulingType,
          hosts: updatedBookings[index].eventType?.hosts,
        },
        bookerUrl,
      };

      if (hasRecurringPattern) {
        evtOfBooking.recurringEvent = bookingRecurringEvent;
      }

      evtOfBooking.startTime = updatedBookings[index].startTime.toISOString();
      evtOfBooking.endTime = updatedBookings[index].endTime.toISOString();
      evtOfBooking.uid = updatedBookings[index].uid;
      const isFirstBooking = index === 0;

      if (!eventTypeMetadata?.disableStandardEmails?.all?.attendee) {
        await scheduleMandatoryReminder(
          evtOfBooking,
          workflows,
          false,
          !!updatedBookings[index].eventType?.owner?.hideBranding,
          evt.attendeeSeatId,
          !emailsEnabled && Boolean(platformClientParams?.platformClientId)
        );
      }
      const bookingResponse = isPrismaObjOrUndefined(updatedBookings[index]?.responses);
      const attendeePhoneNumber = (bookingResponse?.attendeePhoneNumber ||
        bookingResponse?.smsReminderNumber ||
        bookingResponse?.phone ||
        null) as string | null;

      await scheduleWorkflowReminders({
        workflows,
        smsReminderNumber: attendeePhoneNumber,
        calendarEvent: evtOfBooking,
        isFirstRecurringEvent: isFirstBooking,
        hideBranding: !!updatedBookings[index].eventType?.owner?.hideBranding,
      });
    }
  } catch (error) {
    // Silently fail

    console.error("error", error);
  }

  // Webhooks and scheduled triggers
  try {
    const subscribersBookingCreated = await getWebhooks({
      userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });
    const subscribersMeetingStarted = await getWebhooks({
      userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId: eventType?.teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });
    const subscribersMeetingEnded = await getWebhooks({
      userId,
      eventTypeId: booking.eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId: eventType?.teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });

    const scheduleTriggerPromises: Promise<unknown>[] = [];

    const updatedBookingsWithCalEventResponses = updatedBookings.map((booking) => {
      return {
        ...booking,
        ...getCalEventResponses({
          bookingFields: booking.eventType?.bookingFields ?? null,
          booking,
        }),
      };
    });

    subscribersMeetingStarted.forEach((subscriber) => {
      updatedBookingsWithCalEventResponses.forEach((booking) => {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
          })
        );
      });
    });
    subscribersMeetingEnded.forEach((subscriber) => {
      updatedBookingsWithCalEventResponses.forEach((booking) => {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
          })
        );
      });
    });

    await Promise.all(scheduleTriggerPromises);

    await scheduleNoShowTriggers({
      booking: {
        startTime: booking.startTime,
        id: booking.id,
        location: booking.location,
      },
      triggerForUser,
      organizerUser: { id: booking.userId },
      eventTypeId: booking.eventTypeId,
      teamId,
      orgId,
      oAuthClientId: platformClientParams?.platformClientId,
    });

    const eventTypeInfo: EventTypeInfo = {
      eventTitle: eventType?.title,
      eventDescription: eventType?.description,
      requiresConfirmation: eventType?.requiresConfirmation || null,
      price: eventType?.price,
      currency: eventType?.currency,
      length: eventType?.length,
    };

    const payload: EventPayloadType = {
      ...evt,
      ...eventTypeInfo,
      bookingId,
      eventTypeId: eventType?.id,
      status: "ACCEPTED",
      smsReminderNumber: booking.smsReminderNumber || undefined,
      metadata: meetingUrl ? { videoCallUrl: meetingUrl } : undefined,
      ...(platformClientParams ? platformClientParams : {}),
    };

    const promises = subscribersBookingCreated.map((sub) =>
      sendPayload(
        sub.secret,
        WebhookTriggerEvents.BOOKING_CREATED,
        new Date().toISOString(),
        sub,
        payload
      ).catch((e) => {
        log.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CREATED}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}, platformClientId: ${platformClientParams?.platformClientId}`,
          safeStringify(e)
        );
      })
    );

    await Promise.all(promises);

    if (paid) {
      let paymentExternalId: string | undefined;
      const subscriberMeetingPaid = await getWebhooks({
        userId,
        eventTypeId: booking.eventTypeId,
        triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
        teamId: eventType?.teamId,
        orgId,
        oAuthClientId: platformClientParams?.platformClientId,
      });
      const bookingWithPayment = await prisma.booking.findUnique({
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
        eventTypeId: eventType?.id,
        bookerEmail: evt.attendees[0].email,
        eventTitle: eventType?.title,
        externalId: paymentExternalId,
      };

      payload.paymentId = bookingWithPayment?.payment?.[0].id;
      payload.metadata = {
        ...(paid ? paymentMetadata : {}),
      };

      const bookingPaidSubscribers = subscriberMeetingPaid.map((sub) =>
        sendPayload(
          sub.secret,
          WebhookTriggerEvents.BOOKING_PAID,
          new Date().toISOString(),
          sub,
          payload
        ).catch((e) => {
          log.error(
            `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_PAID}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
            safeStringify(e)
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
