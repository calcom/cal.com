import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import { scheduleMandatoryReminder } from "@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder";
import { sendScheduledEmailsAndSMS } from "@calcom/emails/email-manager";
import type { Actor } from "@calcom/features/booking-audit/lib/dto/types";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import type { EventManagerUser } from "@calcom/features/bookings/lib/EventManager";
import EventManager, { placeholderCreatedEvent } from "@calcom/features/bookings/lib/EventManager";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { PlatformClientParams } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";
import { v4 as uuidv4 } from "uuid";
import { getCalEventResponses } from "./getCalEventResponses";
import { scheduleNoShowTriggers } from "./handleNewBooking/scheduleNoShowTriggers";

async function fireBookingAcceptedEvent({
  actor,
  organizationId,
  actionSource,
  acceptedBookings,
  tracingLogger,
}: {
  actor: Actor;
  organizationId: number | null;
  actionSource: ActionSource;
  acceptedBookings: {
    uid: string;
    oldStatus: BookingStatus;
  }[];
  tracingLogger: ISimpleLogger;
}) {
  try {
    const bookingEventHandlerService = getBookingEventHandlerService();
    if (acceptedBookings.length > 1) {
      const operationId = uuidv4();
      await bookingEventHandlerService.onBulkBookingsAccepted({
        bookings: acceptedBookings.map((acceptedBooking) => ({
          bookingUid: acceptedBooking.uid,
          auditData: {
            status: { old: acceptedBooking.oldStatus, new: BookingStatus.ACCEPTED },
          },
        })),
        actor,
        organizationId,
        operationId,
        source: actionSource,
      });
    } else if (acceptedBookings.length === 1) {
      const acceptedBooking = acceptedBookings[0];
      await bookingEventHandlerService.onBookingAccepted({
        bookingUid: acceptedBooking.uid,
        actor,
        organizationId,
        auditData: {
          status: { old: acceptedBooking.oldStatus, new: BookingStatus.ACCEPTED },
        },
        source: actionSource,
      });
    }
  } catch (error) {
    tracingLogger.error("Error firing booking accepted event", safeStringify(error));
  }
}

export async function handleConfirmation(args: {
  user: EventManagerUser & { username: string | null };
  evt: CalendarEvent;
  recurringEventId?: string;
  prisma: PrismaClient;
  bookingId: number;
  booking: {
    startTime: Date;
    id: number;
    uid: string;
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
      } | null;
      workflows?: {
        workflow: Workflow;
      }[];
    } | null;
    metadata?: Prisma.JsonValue;
    eventTypeId: number | null;
    smsReminderNumber: string | null;
    userId: number | null;
    location: string | null;
    status: BookingStatus;
  };
  paid?: boolean;
  emailsEnabled?: boolean;
  platformClientParams?: PlatformClientParams;
  traceContext: TraceContext;
  actionSource: ActionSource;
  actor: Actor;
}) {
  const {
    user,
    evt,
    recurringEventId,
    prisma,
    bookingId,
    booking,
    paid,
    emailsEnabled = true,
    platformClientParams,
    traceContext,
    actionSource,
    actor,
  } = args;
  const eventType = booking.eventType;
  const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType?.metadata || {});
  const apps = eventTypeAppMetadataOptionalSchema.parse(eventTypeMetadata?.apps);
  const eventManager = new EventManager(user, apps);
  const areCalendarEventsEnabled = platformClientParams?.areCalendarEventsEnabled ?? true;
  const scheduleResult = await eventManager.create(evt, { skipCalendarEvent: !areCalendarEventsEnabled });
  const results = scheduleResult.results;
  const metadata: AdditionalInformation = {};
  const workflows = await getAllWorkflowsFromEventType(eventType, booking.userId);

  const spanContext = distributedTracing.createSpan(traceContext, "handle_confirmation");

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);

  if (results.length > 0 && results.every((res) => !res.success)) {
    const error = {
      errorCode: "BookingCreatingMeetingFailed",
      message: "Booking failed",
    };

    tracingLogger.error(`Booking ${user.username} failed`, safeStringify({ error, results }));
  } else {
    if (results.length) {
      // TODO: Handle created event metadata more elegantly
      metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
      metadata.conferenceData = results[0].createdEvent?.conferenceData;
      metadata.entryPoints = results[0].createdEvent?.entryPoints;
    }
    try {
      let isHostConfirmationEmailsDisabled = false;
      let isAttendeeConfirmationEmailDisabled = false;

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

      if (emailsEnabled) {
        await sendScheduledEmailsAndSMS(
          { ...evt, additionalInformation: metadata },
          undefined,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled,
          eventTypeMetadata
        );
      }
    } catch (error) {
      tracingLogger.error(error);
    }
  }
  let updatedBookings: {
    id: number;
    status: BookingStatus;
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

  let acceptedBookings: {
    oldStatus: BookingStatus;
    uid: string;
  }[];
  if (recurringEventId) {
    // The booking to confirm is a recurring event and comes from /booking/recurring, proceeding to mark all related
    // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
    const unconfirmedRecurringBookings = await prisma.booking.findMany({
      where: {
        recurringEventId,
        status: BookingStatus.PENDING,
      },
    });

    acceptedBookings = unconfirmedRecurringBookings.map((booking) => ({
      oldStatus: booking.status,
      uid: booking.uid,
    }));

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
              schedulingType: true,
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
              owner: {
                select: {
                  hideBranding: true,
                },
              },
            },
          },
          status: true,
          description: true,
          cancellationReason: true,
          attendees: true,
          responses: true,
          location: true,
          title: true,
          uid: true,
          startTime: true,
          metadata: true,
          endTime: true,
          smsReminderNumber: true,
          customInputs: true,
          id: true,
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
        status: true,
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
    acceptedBookings = [
      {
        oldStatus: booking.status,
        uid: booking.uid,
      },
    ];
  }

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: eventType?.teamId ?? null },
      parentId: eventType?.parentId ?? null,
    },
  });

  const triggerForUser = !teamId || (teamId && eventType?.parentId);

  const userId = triggerForUser ? booking.userId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: userId, teamId });

  const bookerUrl = await getBookerBaseUrl(orgId ?? null);

  await fireBookingAcceptedEvent({
    actor,
    acceptedBookings,
    organizationId: orgId ?? null,
    actionSource,
    tracingLogger,
  });

  //Workflows - set reminders for confirmed events
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
      evtOfBooking.startTime = updatedBookings[index].startTime.toISOString();
      evtOfBooking.endTime = updatedBookings[index].endTime.toISOString();
      evtOfBooking.uid = updatedBookings[index].uid;
      const isFirstBooking = index === 0;

      if (!eventTypeMetadata?.disableStandardEmails?.all?.attendee) {
        await scheduleMandatoryReminder({
          evt: evtOfBooking,
          workflows,
          requiresConfirmation: false,
          hideBranding: !!updatedBookings[index].eventType?.owner?.hideBranding,
          seatReferenceUid: evt.attendeeSeatId,
          isPlatformNoEmail: !emailsEnabled && Boolean(platformClientParams?.platformClientId),
          traceContext: spanContext,
        });
      }

      const creditService = new CreditService();

      await WorkflowService.scheduleWorkflowsForNewBooking({
        workflows,
        smsReminderNumber: updatedBookings[index].smsReminderNumber,
        calendarEvent: evtOfBooking,
        hideBranding: !!updatedBookings[index].eventType?.owner?.hideBranding,
        isConfirmedByDefault: true,
        isNormalBookingOrFirstRecurringSlot: isFirstBooking,
        isRescheduleEvent: false,
        creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
      });
    }
  } catch (error) {
    // Silently fail
    console.error(error);
  }

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
        uid: booking.uid,
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
        tracingLogger.error(
          `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CREATED}, URL: ${sub.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}, platformClientId: ${platformClientParams?.platformClientId}`,
          safeStringify(e)
        );
      })
    );

    await Promise.all(promises);
  } catch (error) {
    // Silently fail
    console.error(error);
  }
}
