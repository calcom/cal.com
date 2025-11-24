import {
  generateRecurringInstances,
  normalizeDateForComparison,
} from "@calid/features/modules/teams/lib/recurrenceUtil";
import { sendCancelledReminders } from "@calid/features/modules/workflows/utils/reminderScheduler";
import type { CalIdWorkflow, Prisma } from "@prisma/client";
import type { z } from "zod";

import bookingCancelPaymentHandler from "@calcom/app-store/_utils/payments/bookingCancelPaymentHandler";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { DailyLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmailsAndSMS } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import EventManager from "@calcom/lib/EventManager";
import {
  IS_DEV,
  ONEHASH_API_KEY,
  ONEHASH_CHAT_SYNC_BASE_URL,
  MOBILE_NOTIFICATIONS_ENABLED,
} from "@calcom/lib/constants";
import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { sendMobileNotification } from "@calcom/lib/notifications";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  bookingMetadataSchema,
  eventTypeMetaDataSchemaWithTypedApps,
  bookingCancelInput,
} from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { CalendarEvent, RecurringEvent } from "@calcom/types/Calendar";

import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { bookingToDeleteSelect, getBookingToDelete } from "./getBookingToDelete";
import { handleInternalNote } from "./handleInternalNote";
import cancelAttendeeSeat from "./handleSeats/cancel/cancelAttendeeSeat";

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
  bookingData: z.infer<typeof bookingCancelInput>;
} & PlatformParams;

export type HandleCancelBookingResponse = {
  success: boolean;
  message: string;
  onlyRemovedAttendee: boolean;
  bookingId: number;
  bookingUid: string;
  cancelledInstancesCount?: number;
};

/**
 * Helper function to get team name from event type
 */
function getTeamNameFromEventType(eventType: BookingToDelete["eventType"]): string | null {
  if (!eventType) return null;

  // Priority: calIdTeam > team
  if (eventType.calIdTeam?.name) {
    return eventType.calIdTeam.name;
  }

  return null;
}

/**
 * Parse date string to Date object with proper timezone handling
 */
function parseDateString(dateStr: string, timeZone?: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
}

// /**
//  * Format date to RFC 5545 EXDATE format (YYYYMMDDTHHMMSSZ)
//  */
// function formatToExDateString(date: Date): string {
//   const year = date.getUTCFullYear();
//   const month = String(date.getUTCMonth() + 1).padStart(2, "0");
//   const day = String(date.getUTCDate()).padStart(2, "0");
//   const hour = String(date.getUTCHours()).padStart(2, "0");
//   const minute = String(date.getUTCMinutes()).padStart(2, "0");
//   const second = String(date.getUTCSeconds()).padStart(2, "0");

//   return `${year}${month}${day}T${hour}${minute}${second}Z`;
// }

/**
 * Check if all future instances are being cancelled
 */
function areAllFutureInstancesCancelled(
  recurringEvent: any,
  cancelledDates: Date[],
  bookingStartTime: Date,
  timeZone: string
): boolean {
  if (!recurringEvent) {
    return true;
  }
  const allInstances = generateRecurringInstances(recurringEvent, bookingStartTime, timeZone);
  const now = new Date();

  const futureInstances = allInstances.filter((instance) => instance >= now);

  if (futureInstances.length === 0) {
    return false;
  }

  const cancelledDateStrings = new Set(
    cancelledDates.map((date) => normalizeDateForComparison(date, timeZone))
  );

  const futureCancellations = futureInstances.filter((instance) => {
    const instanceStr = normalizeDateForComparison(instance, timeZone);
    return cancelledDateStrings.has(instanceStr);
  });

  return futureCancellations.length === futureInstances.length;
}

/**
 * Update booking metadata with new exdates
 */
async function updateBookingWithExDates(
  bookingId: number,
  existingMetadata: any,
  cancelledDates: Date[]
): Promise<void> {
  const metadata = bookingMetadataSchema.parse(existingMetadata || {});

  if (!metadata?.recurringEvent) {
    throw new Error("No recurringEvent found in booking metadata");
  }

  // Get existing exdates
  const existingExDates = metadata.recurringEvent.exDates || [];

  // Add new cancelled dates to exdates, avoiding duplicates
  const existingExDateStrings = new Set(existingExDates);
  const newExDates = cancelledDates
    // .map((date) => formatToExDateString(date))
    .filter((dateStr) => !existingExDateStrings.has(dateStr));

  const updatedExDates = [...existingExDates, ...newExDates];

  // Update booking metadata
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      metadata: {
        ...metadata,
        recurringEvent: {
          ...metadata.recurringEvent,
          exDates: updatedExDates,
        } as RecurringEvent,
      },
    },
  });

  log.info("Updated booking with exDates", {
    bookingId,
    newExDatesCount: newExDates.length,
    totalExDatesCount: updatedExDates.length,
  });
}

/**
 * Cancel the entire recurring series
 */
async function cancelEntireSeries(
  bookingToDelete: BookingToDelete,
  cancellationReason: string | null,
  cancelledBy: string | null
): Promise<BookingToDelete[]> {
  const metadata = bookingMetadataSchema.parse(bookingToDelete.metadata || {});

  if (!metadata?.recurringEvent) {
    throw new Error("No recurringEvent found in booking metadata");
  }

  // Mark the main booking as cancelled
  const where: Prisma.BookingWhereUniqueInput = { id: bookingToDelete.id };

  await prisma.booking.update({
    where,
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason,
      cancelledBy,
    },
  });

  const cancelledBooking = await prisma.booking.findUnique({
    where,
    select: bookingToDeleteSelect,
  });

  return cancelledBooking ? [cancelledBooking] : [];
}

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
    autoRefund,
    fromApi,
    cancelledDates, //  Array of ISO date strings for specific instances to cancel
  } = bookingCancelInput.parse(body);
  const bookingToDelete = await getBookingToDelete(id, uid);
  const deleteType = cancelledDates && cancelledDates.length > 0 ? "instance" : "series";
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

  if (bookingToDelete.eventType?.disableCancelling && bookingToDelete.eventType.owner?.id !== userId) {
    throw new HttpError({
      statusCode: 400,
      message: "This event type does not allow cancellations",
    });
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

  // Get team ID from CalIdTeam (new model)
  const teamId = await getTeamIdFromEventType({
    eventType: {
      calIdTeam: { id: bookingToDelete.eventType?.calIdTeamId ?? null },
      parentId: bookingToDelete?.eventType?.parentId ?? null,
    },
  });
  // Since CalIdTeam doesn't have parent/organization concept, we always trigger for user when there's a team
  const triggerForUser = !teamId;
  const organizerUserId = triggerForUser ? bookingToDelete.userId : null;

  // No organization support in CalIdTeam, so orgId is always null
  const orgId = null;

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
      metadata: true,
    },
  });

  const teamMembersPromises = [];
  const attendeesListPromises = [];
  const hostsPresent = !!bookingToDelete.eventType?.hosts;
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

      if (!isTeamEvent || (isTeamEvent && !isTeamMember)) {
        attendeesListPromises.push(attendeeObject);
      } else {
        teamMembersPromises.push(attendeeObject);
      }
    }
  }

  const attendeesList = await Promise.all(attendeesListPromises);
  const teamMembers = await Promise.all(teamMembersPromises);

  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");
  const tAttendees = await getTranslation(attendeesList[0].language.locale ?? "en", "common");
  const teamName = getTeamNameFromEventType(bookingToDelete.eventType);

  const evt: CalendarEvent = {
    bookerUrl: await getBookerBaseUrl(bookingToDelete.eventType?.team?.parentId ?? orgId ?? null),
    title: bookingToDelete?.title,
    type: bookingToDelete?.eventType?.title || bookingToDelete?.title,
    description: bookingToDelete?.description || "",
    customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
    ...getCalEventResponses({
      bookingFields: bookingToDelete.eventType?.bookingFields ?? null,
      booking: bookingToDelete,
    }),
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      id: organizer.id,
      username: organizer.username || undefined,
      name: organizer.name || "Nameless",
      email: organizer.email,
      timeZone: organizer.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(organizer.timeFormat),
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: bookingToDelete.uid,
    bookingId: bookingToDelete.id,
    destinationCalendar: bookingToDelete?.destinationCalendar
      ? [bookingToDelete?.destinationCalendar]
      : bookingToDelete?.user.destinationCalendar
      ? [bookingToDelete?.user.destinationCalendar]
      : [],
    cancellationReason: cancellationReason || "",
    iCalSequence: bookingToDelete.iCalSequence || 0,
    iCalUID: bookingToDelete.iCalUID || "",
    location: bookingToDelete?.location,
    eventTypeId: bookingToDelete.eventTypeId,
    seatsShowAttendees: !!bookingToDelete.eventType?.seatsShowAttendees,
    seatsPerTimeSlot: bookingToDelete.eventType?.seatsPerTimeSlot,
    recurringEvent: parseRecurringEvent(bookingToDelete.eventType?.recurringEvent),
    ...(teamMembers &&
      teamId && {
        team: {
          name: getTeamNameFromEventType(bookingToDelete.eventType) || "Nameless",
          members: teamMembers,
          id: teamId,
        },
      }),
    paymentInfo: null,
    platformCancelUrl,
    platformRescheduleUrl,
    platformBookingUrl,
  };

  // Handle seated events
  if (!!seatReferenceUid) {
    log.debug("Handling cancellation for seated event", { seatReferenceUid });
    const webhooks = await getWebhooks(subscriberOptions);
    const response = await cancelAttendeeSeat(
      { seatReferenceUid, bookingToDelete },
      { evt, eventTypeInfo, webhooks },
      bookingToDelete.eventType?.metadata as EventTypeMetadata
    );
    return response;
  }

  // Handle workflows
  const eventTypeRaw = !bookingToDelete.eventTypeId ? null : { id: bookingToDelete.eventTypeId };
  const eventTypeRelated = eventTypeRaw
    ? await getAllWorkflowsFromEventType(bookingToDelete.eventType, bookingToDelete.userId)
    : null;
  const eventType = { ...bookingToDelete.eventType, workflows: eventTypeRelated };

  const workflows: CalIdWorkflow[] = eventType?.workflows?.map((workflow) => workflow as CalIdWorkflow);

  if (workflows.length > 0) {
    await sendCancelledReminders({
      workflows: workflows as CalIdWorkflow[],
      smsReminderNumber: bookingToDelete.smsReminderNumber,
      evt: { ...evt, metadata: bookingToDelete.metadata, eventType: { slug: eventType?.slug } },
      hideBranding: !!eventType?.owner?.hideBranding,
    });
    try {
    } catch (error) {
      log.error("Error sending cancelled workflow reminders:", error);
    }
  }

  // Send webhooks
  const subscribersMeetingEnded = await getWebhooks(subscriberOptions);
  const promises = subscribersMeetingEnded.map((sub) =>
    sendPayload(sub.secret, eventTrigger, new Date().toISOString(), sub, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
    }).catch((e) => {
      log.error(`Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`, e, {
        secretHash: sub.secret ? "YES" : "NO",
        secretLength: sub.secret?.length,
        subscriberUrl: sub.subscriberUrl,
      });
    })
  );
  await Promise.all(promises);

  const updatedBookingSelect = {
    uid: true,
    id: true,
    startTime: true,
    payment: true,
    metadata: true,
    eventTypeId: true,
    eventType: {
      select: {
        id: true,
        owner: true,
        recurringEvent: true,
        requiresConfirmation: true,
        metadata: true,
      },
    },
    calIdWorkflowReminders: true,
  };

  let updatedBookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
  let cancelledInstancesCount = 0;

  // Determine timezone
  const timeZone = bookingToDelete.user?.timeZone || "UTC";

  // ==========================================
  // NEW LOGIC: Handle recurring instance cancellation
  // ==========================================
  const metadata = bookingMetadataSchema.parse(bookingToDelete.metadata || {});
  const hasRecurringEvent = metadata?.recurringEvent && bookingToDelete.eventType?.recurringEvent;
  let isRecurringInstanceCancellation = false;
  let updatedRecurringEvent: RecurringEvent | null = null;
  if (
    hasRecurringEvent &&
    cancelledDates &&
    cancelledDates.length > 0
    //  && deleteType === "instance"
  ) {
    log.info("Handling recurring instance cancellation", {
      bookingId: bookingToDelete.id,
      cancelledDatesCount: cancelledDates.length,
    });

    // Parse cancelled dates
    const parsedCancelledDates = cancelledDates.map((dateStr) => parseDateString(dateStr, timeZone));

    // Check if all future instances are being cancelled
    const allFutureCancelled = areAllFutureInstancesCancelled(
      metadata.recurringEvent,
      parsedCancelledDates,
      bookingToDelete.startTime,
      timeZone
    );

    if (allFutureCancelled) {
      log.info("All future instances are being cancelled, cancelling entire series", {
        bookingId: bookingToDelete.id,
      });

      // Cancel entire series
      updatedBookings = await cancelEntireSeries(
        bookingToDelete,
        cancellationReason ?? "N/A",
        cancelledBy ?? "N/A"
      );
      cancelledInstancesCount = parsedCancelledDates.length;
    } else {
      isRecurringInstanceCancellation = true;
      // Cancel only specific instances by updating exdates
      await updateBookingWithExDates(bookingToDelete.id, bookingToDelete.metadata, parsedCancelledDates);

      // Fetch updated booking
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: bookingToDelete.id },
        select: updatedBookingSelect,
      });

      if (updatedBooking) {
        updatedBookings.push(updatedBooking);
      }

      cancelledInstancesCount = parsedCancelledDates.length;
      // zod parse the updated booking metadata recurringEvent
      const updatedBookingMetadata = bookingMetadataSchema.parse(updatedBooking?.metadata || {});
      //if successfully parsed, set
      updatedRecurringEvent = updatedBookingMetadata?.recurringEvent || null;

      log.info("Updated booking with exdates for instance cancellation", {
        bookingId: bookingToDelete.id,
        cancelledInstancesCount,
      });
    }
  } else if (allRemainingBookings || cancelSubsequentBookings) {
    updatedBookings = await cancelEntireSeries(
      bookingToDelete,
      cancellationReason ?? "N/A",
      cancelledBy ?? "N/A"
    );
  }
  // Handle single booking cancellation
  else {
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
      select: updatedBookingSelect,
    });
    updatedBookings.push(updatedBooking);
    //Refund is handled below using bookingCancelPaymentHandler
    // if (!!bookingToDelete.payment.length) {
    //   await processPaymentRefund({
    //     booking: bookingToDelete,
    //     teamId,
    //   });
    // }
  }

  /** TODO: Remove this without breaking functionality */
  if (bookingToDelete.location === DailyLocationType) {
    bookingToDelete.user.credentials.push({
      ...FAKE_DAILY_CREDENTIAL,
      // Use calIdTeamId, fallback to team.id for backwards compatibility
      teamId: bookingToDelete.eventType?.calIdTeamId || bookingToDelete.eventType?.team?.id || null,
    });
  }

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

    let isBookingInRecurringSeries = false;
    //only if recurring instance cancellation, we will pass cancelledDates to event manager
    if (isRecurringInstanceCancellation) {
      const enhancedEvt = {
        ...evt,
        cancelledDates: cancelledDates || [],
      };
      isBookingInRecurringSeries = true;

      await eventManager.cancelEvent(enhancedEvt, bookingToDelete.references, isBookingInRecurringSeries);
    } else {
      isBookingInRecurringSeries = !!hasRecurringEvent;
      await eventManager.cancelEvent(evt, bookingToDelete.references, isBookingInRecurringSeries);
    }

    // Only delete booking references if the entire booking is cancelled (not just instances)
    if (!isRecurringInstanceCancellation) {
      await prisma.bookingReference.deleteMany({
        where: {
          bookingId: bookingToDelete.id,
        },
      });
    }
  } catch (error) {
    log.error(`Error deleting integrations`, safeStringify({ error }));
  }

  const organizerHasIntegratedOHChat = !!isPrismaObjOrUndefined(organizer.metadata)?.connectedChatAccounts;
  const cancelledBookingsUids = [];

  if (!isRecurringInstanceCancellation) {
    //Entire booking is being cancelled, in that case we revoke any scheduled webhook triggers and workflow reminders
    // and also handle payment refund if needed
    try {
      const webhookTriggerPromises = [];
      const calIdWorkflowReminderPromises = [];
      const paymentCancellationPromises = [];
      for (const booking of updatedBookings) {
        // delete scheduled webhook triggers of cancelled bookings
        webhookTriggerPromises.push(deleteWebhookScheduledTriggers({ booking }));

        //Workflows - cancel all reminders for cancelled bookings
        calIdWorkflowReminderPromises.push(
          WorkflowRepository.deleteAllWorkflowReminders(booking.calIdWorkflowReminders)
        );
        if (autoRefund) {
          if (!booking.payment) {
            log.warn(`No payment found for booking ${booking.id}`);
            continue;
          }
          const cancelPaymentPromise = bookingCancelPaymentHandler({
            payment: booking.payment,
            eventType: booking.eventType,
          });
          const updateBookingPromise = prisma.booking.update({
            where: {
              id: booking.id,
            },
            data: {
              metadata: {
                ...booking.metadata,
                paymentStatus: "refunded",
              },
            },
          });

          paymentCancellationPromises.push(Promise.all([cancelPaymentPromise, updateBookingPromise]));
        }

        cancelledBookingsUids.push(booking.uid);
      }

      await Promise.allSettled([...webhookTriggerPromises, ...calIdWorkflowReminderPromises]).then(
        (results) => {
          const rejectedReasons = results
            .filter((result): result is PromiseRejectedResult => result.status === "rejected")
            .map((result) => result.reason);

          if (rejectedReasons.length > 0) {
            log.error(
              "An error occurred when deleting workflow reminders and webhook triggers",
              rejectedReasons
            );
          }
        }
      );
    } catch (error) {
      log.error("Error deleting scheduled webhooks and workflows", safeStringify({ error }));
    }
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
    if ((!platformClientId || (platformClientId && arePlatformEmailsEnabled)) && !fromApi) {
      //passing updated recurringEvent for the case of recurring instance cancellation, so we can display the cancelled dates in the email
      await sendCancelledEmailsAndSMS(
        !!updatedRecurringEvent ? { ...evt, recurringEvent: updatedRecurringEvent } : evt,
        { eventName: bookingToDelete?.eventType?.eventName },
        bookingToDelete?.eventType?.metadata as EventTypeMetadata
      );
    }
  } catch (error) {
    log.error("Error deleting event", error);
  }

  if (MOBILE_NOTIFICATIONS_ENABLED) {
    const result = await sendMobileNotification(
      `host_${organizer.id}`,
      {
        title: isRecurringInstanceCancellation
          ? tOrganizer("booking_instance_cancelled")
          : tOrganizer("booking_cancelled"),
        body: evt.title,
      },
      {
        bookingId: evt.bookingId,
        status: "CANCELLED",
      }
    );
    if (result !== "skipped:disabled" && result !== "skipped:unavailable") {
      log.debug("Mobile notification sent", { result });
    }
  }

  if (!isRecurringInstanceCancellation && organizerHasIntegratedOHChat) {
    await handleOHChatSync(cancelledBookingsUids);
  }

  return {
    success: true,
    message:
      deleteType === "instance"
        ? `Successfully cancelled ${cancelledInstancesCount} instance(s)`
        : "Booking successfully cancelled.",
    onlyRemovedAttendee: false,
    bookingId: bookingToDelete.id,
    bookingUid: bookingToDelete.uid,
    ...(deleteType === "instance" && { cancelledInstancesCount }),
  } satisfies HandleCancelBookingResponse;
}

async function handleOHChatSync(bookingUids: string[]) {
  if (IS_DEV) return Promise.resolve();
  if (bookingUids.length === 0) return Promise.resolve();

  const queryParams = new URLSearchParams({ bookingUids: bookingUids.join(",") });

  await fetch(`${ONEHASH_CHAT_SYNC_BASE_URL}/cal_booking?${queryParams}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONEHASH_API_KEY}`,
    },
  });
}

export default handler;
