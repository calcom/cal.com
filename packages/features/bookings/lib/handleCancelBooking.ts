import type { z } from "zod";

import { DailyLocationType } from "@calcom/app-store/constants";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmailsAndSMS } from "@calcom/emails/email-manager";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { processNoShowFeeOnCancellation } from "@calcom/features/bookings/lib/payment/processNoShowFeeOnCancellation";
import { processPaymentRefund } from "@calcom/features/bookings/lib/payment/processPaymentRefund";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { PrismaOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  cancelNoShowTasksForBooking,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
// TODO: Prisma import would be used from DI in a followup PR when we remove `handler` export
import prisma from "@calcom/prisma";
import type { Prisma, PrismaClient, WorkflowReminder } from "@calcom/prisma/client";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema, bookingCancelInput } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type {
  CancelRegularBookingData,
  CancelBookingMeta,
  HandleCancelBookingResponse,
} from "./dto/BookingCancel";
import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getBookingToDelete } from "./getBookingToDelete";
import { handleInternalNote } from "./handleInternalNote";
import cancelAttendeeSeat from "./handleSeats/cancel/cancelAttendeeSeat";
import type { IBookingCancelService } from "./interfaces/IBookingCancelService";

const log = logger.getSubLogger({ prefix: ["handleCancelBooking"] });

type PlatformParams = {
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  arePlatformEmailsEnabled?: boolean;
};

export type BookingToDelete = Awaited<ReturnType<typeof getBookingToDelete>>;

export type CancelBookingInput = {
  userId?: number;
  userUuid?: string;
  bookingData: z.infer<typeof bookingCancelInput>;
} & PlatformParams;

async function handler(input: CancelBookingInput) {
  const body = input.bookingData;
  const {
    id,
    uid,
    allRemainingBookings,
    cancellationReason,
    seatReferenceUid,
    cancelledBy,
    cancelSubsequentBookings,
    internalNote,
    skipCancellationReasonValidation = false,
  } = bookingCancelInput.parse(body);
  const bookingToDelete = await getBookingToDelete(id, uid);
  const {
    userId,
    platformBookingUrl,
    platformCancelUrl,
    platformClientId,
    platformRescheduleUrl,
    arePlatformEmailsEnabled,
  } = input;

  /**
   * Important: We prevent cancelling an already cancelled booking.
   * A booking could have been CANCELLED due to a reschedule,
   * in which case we simply update the existing calendar event and meeting.
   * We want to avoid deleting them by a subsequent cancellation attempt.
   */
  if (bookingToDelete.status === BookingStatus.CANCELLED) {
    throw new HttpError({
      statusCode: 400,
      message: "This booking has already been cancelled.",
    });
  }

  if (!bookingToDelete.userId || !bookingToDelete.user) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  if (bookingToDelete.eventType?.disableCancelling) {
    throw new HttpError({
      statusCode: 400,
      message: "This event type does not allow cancellations",
    });
  }

  const isCancellationUserHost =
    bookingToDelete.userId == userId || bookingToDelete.user.email === cancelledBy;

  if (
    !platformClientId &&
    !cancellationReason?.trim() &&
    isCancellationUserHost &&
    !skipCancellationReasonValidation
  ) {
    throw new HttpError({
      statusCode: 400,
      message: "Cancellation reason is required when you are the host",
    });
  }

  if (bookingToDelete.endTime && new Date() > new Date(bookingToDelete.endTime)) {
    throw new HttpError({
      statusCode: 400,
      message: "Cannot cancel a booking that has already ended",
    });
  }

  // If the booking is a seated event and there is no seatReferenceUid we should validate that logged in user is host
  if (bookingToDelete.eventType?.seatsPerTimeSlot && !seatReferenceUid) {
    const userIsHost = bookingToDelete.eventType.hosts.find((host) => {
      if (host.user.id === userId) return true;
    });

    const userIsOwnerOfEventType = bookingToDelete.eventType.owner?.id === userId;

    const userIsOrgAdminOfBookingUser =
      userId &&
      (await PrismaOrgMembershipRepository.isLoggedInUserOrgAdminOfBookingHost(
        userId,
        bookingToDelete.userId
      ));

    if (!userIsHost && !userIsOwnerOfEventType && !userIsOrgAdminOfBookingUser) {
      throw new HttpError({
        statusCode: 401,
        message: "User not a host of this event or an admin of the booking user",
      });
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
  const organizerUserId = triggerForUser ? bookingToDelete.userId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });

  const subscriberOptions: GetSubscriberOptions = {
    userId: organizerUserId,
    eventTypeId: bookingToDelete.eventTypeId as number,
    triggerEvent: eventTrigger,
    teamId,
    orgId,
    oAuthClientId: platformClientId,
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

  const organizer = await prisma.user.findUniqueOrThrow({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      timeZone: true,
      timeFormat: true,
      locale: true,
    },
  });

  const teamMembersPromises = [];
  const attendeesListPromises = [];
  const hostEmails = new Set(bookingToDelete.eventType?.hosts?.map((host) => host.user.email) ?? []);

  for (let index = 0; index < bookingToDelete.attendees.length; index++) {
    const attendee = bookingToDelete.attendees[index];
    const attendeeObject = {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      phoneNumber: attendee.phoneNumber,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };

    // The first attendee is the booker in all cases, so always consider them as an attendee.
    if (index === 0) {
      attendeesListPromises.push(attendeeObject);
    } else {
      const isTeamEvent = hostEmails.size > 0;
      const isTeamMember = isTeamEvent && hostEmails.has(attendee.email);

      if (isTeamMember) {
        teamMembersPromises.push(attendeeObject);
      } else {
        attendeesListPromises.push(attendeeObject);
      }
    }
  }

  const attendeesList = await Promise.all(attendeesListPromises);
  const teamMembers = await Promise.all(teamMembersPromises);
  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

  const ownerProfile = await prisma.profile.findFirst({
    where: {
      userId: bookingToDelete.userId,
    },
  });

  const bookerUrl = await getBookerBaseUrl(
    bookingToDelete.eventType?.team?.parentId ?? ownerProfile?.organizationId ?? null
  );

  const evt: CalendarEvent = {
    bookerUrl,
    title: bookingToDelete?.title,
    length: bookingToDelete?.eventType?.length,
    type: bookingToDelete?.eventType?.slug as string,
    additionalNotes: bookingToDelete?.description,
    description: bookingToDelete.eventType?.description,
    customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
    eventTypeId: bookingToDelete.eventTypeId as number,
    ...getCalEventResponses({
      bookingFields: bookingToDelete.eventType?.bookingFields ?? null,
      booking: bookingToDelete,
    }),
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      id: organizer.id,
      username: organizer.username || undefined,
      usernameInOrg: ownerProfile?.username || undefined,
      email: bookingToDelete?.userPrimaryEmail ?? organizer.email,
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
    ...(teamMembers &&
      teamId && {
        team: {
          name: bookingToDelete?.eventType?.team?.name || "Nameless",
          members: teamMembers,
          id: teamId,
        },
      }),
    seatsPerTimeSlot: bookingToDelete.eventType?.seatsPerTimeSlot,
    seatsShowAttendees: bookingToDelete.eventType?.seatsShowAttendees,
    iCalUID: bookingToDelete.iCalUID,
    iCalSequence: bookingToDelete.iCalSequence + 1,
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    hideOrganizerEmail: bookingToDelete.eventType?.hideOrganizerEmail,
    platformBookingUrl,
    customReplyToEmail: bookingToDelete.eventType?.customReplyToEmail,
    organizationId: ownerProfile?.organizationId ?? null,
  };

  const dataForWebhooks = { evt, webhooks, eventTypeInfo };

  // If it's just an attendee of a booking then just remove them from that booking
  const result = await cancelAttendeeSeat(
    {
      seatReferenceUid: seatReferenceUid,
      bookingToDelete,
    },
    dataForWebhooks,
    bookingToDelete?.eventType?.metadata as EventTypeMetadata
  );
  if (result)
    return {
      success: true,
      onlyRemovedAttendee: true,
      bookingId: bookingToDelete.id,
      bookingUid: bookingToDelete.uid,
      message: "Attendee successfully removed.",
    } satisfies HandleCancelBookingResponse;

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
      cancelledBy: cancelledBy,
    }).catch((e) => {
      logger.error(
        `Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);

  const workflows = await getAllWorkflowsFromEventType(bookingToDelete.eventType, bookingToDelete.userId);
  const parsedMetadata = bookingMetadataSchema.safeParse(bookingToDelete.metadata || {});

  const creditService = new CreditService();

  await sendCancelledReminders({
    workflows,
    smsReminderNumber: bookingToDelete.smsReminderNumber,
    evt: {
      ...evt,
      ...(parsedMetadata.success && parsedMetadata.data?.videoCallUrl
        ? { metadata: { videoCallUrl: parsedMetadata.data.videoCallUrl } }
        : {}),
      bookerUrl,
      ...{
        eventType: {
          slug: bookingToDelete.eventType?.slug as string,
          schedulingType: bookingToDelete.eventType?.schedulingType,
          hosts: bookingToDelete.eventType?.hosts,
        },
      },
    },
    hideBranding: !!bookingToDelete.eventType?.owner?.hideBranding,
    creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
  });

  let updatedBookings: {
    id: number;
    uid: string;
    workflowReminders: WorkflowReminder[];
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
  if (
    bookingToDelete.eventType?.recurringEvent &&
    bookingToDelete.recurringEventId &&
    (allRemainingBookings || cancelSubsequentBookings)
  ) {
    const recurringEventId = bookingToDelete.recurringEventId;
    const gte = cancelSubsequentBookings ? bookingToDelete.startTime : new Date();
    // Proceed to mark as cancelled all remaining recurring events instances (greater than or equal to right now)
    await prisma.booking.updateMany({
      where: {
        recurringEventId,
        startTime: {
          gte,
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
        cancelledBy: cancelledBy,
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
        id: true,
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
        cancelledBy: cancelledBy,
        // Assume that canceling the booking is the last action
        iCalSequence: evt.iCalSequence || 100,
      },
      select: {
        id: true,
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
      },
    });
    updatedBookings.push(updatedBooking);

    if (bookingToDelete.payment.some((payment) => payment.paymentOption === "ON_BOOKING")) {
      try {
        await processPaymentRefund({
          booking: bookingToDelete,
          teamId,
        });
      } catch (error) {
        log.error(`Error processing payment refund for booking ${bookingToDelete.uid}:`, error);
      }
    } else if (bookingToDelete.payment.some((payment) => payment.paymentOption === "HOLD")) {
      try {
        await processNoShowFeeOnCancellation({
          booking: bookingToDelete,
          payments: bookingToDelete.payment,
          cancelledByUserId: userId,
        });
      } catch (error) {
        log.error(`Error processing no-show fee for booking ${bookingToDelete.uid}:`, error);
      }
    }
  }

  /** TODO: Remove this without breaking functionality */
  if (bookingToDelete.location === DailyLocationType) {
    bookingToDelete.user.credentials.push({
      ...FAKE_DAILY_CREDENTIAL,
      teamId: bookingToDelete.eventType?.team?.id || null,
    });
  }

  const isBookingInRecurringSeries = !!(
    bookingToDelete.eventType?.recurringEvent &&
    bookingToDelete.recurringEventId &&
    allRemainingBookings
  );

  try {
    const bookingToDeleteEventTypeMetadataParsed = eventTypeMetaDataSchemaWithTypedApps.safeParse(
      bookingToDelete.eventType?.metadata || null
    );

    if (!bookingToDeleteEventTypeMetadataParsed.success) {
      log.error(
        `Error parsing metadata`,
        safeStringify({ error: bookingToDeleteEventTypeMetadataParsed?.error })
      );
      throw new Error("Error parsing metadata");
    }

    const bookingToDeleteEventTypeMetadata = bookingToDeleteEventTypeMetadataParsed.data;

    const credentials = await getAllCredentialsIncludeServiceAccountKey(bookingToDelete.user, {
      ...bookingToDelete.eventType,
      metadata: bookingToDeleteEventTypeMetadata,
    });

    const eventManager = new EventManager(
      { ...bookingToDelete.user, credentials },
      bookingToDeleteEventTypeMetadata?.apps
    );

    await eventManager.cancelEvent(evt, bookingToDelete.references, isBookingInRecurringSeries);

    await prisma.bookingReference.updateMany({
      where: {
        bookingId: bookingToDelete.id,
      },
      data: { deleted: true },
    });
  } catch (error) {
    log.error(`Error deleting integrations`, safeStringify({ error }));
  }

  try {
    const webhookTriggerPromises = [];
    const workflowReminderPromises = [];

    for (const booking of updatedBookings) {
      // delete scheduled webhook triggers of cancelled bookings
      webhookTriggerPromises.push(deleteWebhookScheduledTriggers({ booking }));
      webhookTriggerPromises.push(cancelNoShowTasksForBooking({ bookingUid: booking.uid }));

      //Workflows - cancel all reminders for cancelled bookings
      workflowReminderPromises.push(WorkflowRepository.deleteAllWorkflowReminders(booking.workflowReminders));
    }

    await Promise.allSettled([...webhookTriggerPromises, ...workflowReminderPromises]).then((results) => {
      const rejectedReasons = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason);

      if (rejectedReasons.length > 0) {
        log.error("An error occurred when deleting workflow reminders and webhook triggers", rejectedReasons);
      }
    });
  } catch (error) {
    log.error("Error deleting scheduled webhooks and workflows", safeStringify({ error }));
  }

  try {
    if (internalNote && teamId) {
      await handleInternalNote({
        internalNote,
        booking: bookingToDelete,
        userId: userId || -1,
        teamId: teamId,
      });
    }
  } catch (error) {
    log.error("Error handlingInternalNote", safeStringify({ error }));
  }

  try {
    // TODO: if emails fail try to requeue them
    if (!platformClientId || (platformClientId && arePlatformEmailsEnabled))
      await sendCancelledEmailsAndSMS(
        evt,
        { eventName: bookingToDelete?.eventType?.eventName },
        bookingToDelete?.eventType?.metadata as EventTypeMetadata
      );
  } catch (error) {
    log.error("Error deleting event", error);
  }
  return {
    success: true,
    message: "Booking successfully cancelled.",
    onlyRemovedAttendee: false,
    bookingId: bookingToDelete.id,
    bookingUid: bookingToDelete.uid,
  } satisfies HandleCancelBookingResponse;
}

type BookingCancelServiceDependencies = {
  prismaClient: PrismaClient;
};
/**
 * Takes care of cancelling bookings. This includes regular bookings, recurring bookings, seated bookings, etc.
 * Handles both individual booking cancellations and bulk cancellations for recurring events.
 */
export class BookingCancelService implements IBookingCancelService {
  constructor(private readonly deps: BookingCancelServiceDependencies) {}

  async cancelBooking(input: { bookingData: CancelRegularBookingData; bookingMeta?: CancelBookingMeta }) {
    const cancelBookingInput: CancelBookingInput = {
      bookingData: input.bookingData,
      ...(input.bookingMeta || {}),
    };
    // TODO: Deps to be passed to it later when we stop exporting handler
    return handler(cancelBookingInput);
  }
}

export default handler;
