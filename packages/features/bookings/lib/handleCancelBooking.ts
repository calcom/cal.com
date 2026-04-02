import { DailyLocationType } from "@calcom/app-store/constants";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmailsAndSMS } from "@calcom/emails/email-manager";
import type { Actor } from "@calcom/features/booking-audit/lib/dto/types";
import {
  buildActorEmail,
  getUniqueIdentifier,
  makeGuestActor,
  makeUserActor,
} from "@calcom/features/booking-audit/lib/makeActor";
import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { BookingReferenceRepository } from "@calcom/features/bookingReference/repositories/BookingReferenceRepository";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { processNoShowFeeOnCancellation } from "@calcom/features/bookings/lib/payment/processNoShowFeeOnCancellation";
import { processPaymentRefund } from "@calcom/features/bookings/lib/payment/processPaymentRefund";
import { getOrgMembershipRepository } from "@calcom/features/di/containers/OrgMembershipRepository";
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import {
  type EventTypeBrandingData,
  getEventTypeService,
} from "@calcom/features/eventtypes/di/EventTypeService.container";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { cancelNoShowTasksForBooking } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { getTranslation } from "@calcom/i18n/server";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import { HttpError } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
// TODO: Prisma import would be used from DI in a followup PR when we remove `handler` export
import prisma from "@calcom/prisma";
import type { WorkflowMethods } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { bookingCancelInput, bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { v4 as uuidv4 } from "uuid";
import type { z } from "zod";
import { BookingRepository } from "../repositories/BookingRepository";
import { PrismaBookingAttendeeRepository } from "../repositories/PrismaBookingAttendeeRepository";
import { isCancellationReasonRequired } from "./cancellationReason";
import type {
  CancelBookingMeta,
  CancelRegularBookingData,
  HandleCancelBookingResponse,
} from "./dto/BookingCancel";
import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { getBookingToDelete } from "./getBookingToDelete";
import { handleInternalNote } from "./handleInternalNote";
import cancelAttendeeSeat from "./handleSeats/cancel/cancelAttendeeSeat";
import type { IBookingCancelService } from "./interfaces/IBookingCancelService";
import { isActionDisabledByScope } from "./isActionDisabledByScope";

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
  actionSource: ValidActionSource;
  /** When true, suppresses emails, webhooks, and workflow reminders. Internal use only (e.g. spam report bulk cancellation). */
  skipNotifications?: boolean;
  /** When true, skips CRM event deletion during cancellation. Used by blocklist silent cancellations. */
  skipCrmDeletion?: boolean;
} & PlatformParams;

type Dependencies = {
  userRepository: UserRepository;
  bookingRepository: BookingRepository;
  profileRepository: ProfileRepository;
  bookingReferenceRepository: BookingReferenceRepository;
  attendeeRepository: PrismaBookingAttendeeRepository;
};

/**
 * Its job is to ensure that an actor is always returned, otherwise we won't be able to audit the action.
 */
function getAuditActor({
  userUuid,
  cancelledByEmailInQueryParam,
  bookingUid,
}: {
  userUuid: string | null;
  cancelledByEmailInQueryParam: string | null;
  bookingUid: string;
}): Actor {
  if (userUuid) {
    return makeUserActor(userUuid);
  }

  let actorEmail: string;
  // Fallback to guest actor for unauthenticated cancellation
  if (!cancelledByEmailInQueryParam) {
    log.warn(
      "No cancelledBy email in query param available, creating fallback guest actor for audit",
      safeStringify({
        bookingUid,
      })
    );
    // Having fallback prefix makes it clear that we created guest actor from fallback logic
    actorEmail = buildActorEmail({
      identifier: getUniqueIdentifier({ prefix: "fallback" }),
      actorType: "guest",
    });
  } else {
    // We can't trust cancelledByEmail and thus can't reuse it as is because it can be set anything by anyone. If we use that as guest actor, we could accidentally attribute the action to the wrong guest actor.
    // Having param prefix makes it clear that we created guest actor from query param and we still don't use the email as is.
    actorEmail = buildActorEmail({
      identifier: getUniqueIdentifier({ prefix: "param" }),
      actorType: "guest",
    });
  }

  return makeGuestActor({ email: actorEmail, name: null });
}

async function handler(input: CancelBookingInput, dependencies?: Dependencies) {
  const prismaClient = prisma;
  const {
    userRepository,
    bookingRepository,
    profileRepository,
    bookingReferenceRepository,
    attendeeRepository,
  } = dependencies || {
    userRepository: new UserRepository(prismaClient),
    bookingRepository: new BookingRepository(prismaClient),
    profileRepository: new ProfileRepository({ prismaClient }),
    bookingReferenceRepository: new BookingReferenceRepository({ prismaClient }),
    attendeeRepository: new PrismaBookingAttendeeRepository(prismaClient),
  };
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
    skipCalendarSyncTaskCancellation = false,
  } = bookingCancelInput.parse(body);
  const skipNotifications = input.skipNotifications ?? false;
  const bookingToDelete = await getBookingToDelete(id, uid);
  const {
    userId,
    platformBookingUrl,
    platformCancelUrl,
    platformClientId,
    platformRescheduleUrl,
    arePlatformEmailsEnabled,
  } = input;

  const userUuid = input.userUuid ?? null;

  const actionSource = input.actionSource;

  const actorToUse = getAuditActor({
    userUuid,
    cancelledByEmailInQueryParam: cancelledBy ?? null,
    bookingUid: bookingToDelete.uid,
  });

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

  const isCancellationUserHost =
    bookingToDelete.userId === userId || bookingToDelete.user.email === cancelledBy;

  if (bookingToDelete.eventType?.disableCancelling) {
    // Only use authenticated userId for scope check — cancelledBy is untrusted user input.
    const isAuthenticatedHost =
      bookingToDelete.userId === userId ||
      bookingToDelete.eventType.hosts.some((host) => host.user.id === userId);

    if (
      isActionDisabledByScope({
        disableFlag: bookingToDelete.eventType.disableCancelling,
        scope: bookingToDelete.eventType.disableCancellingScope,
        isHost: !!isAuthenticatedHost,
      })
    ) {
      throw new HttpError({
        statusCode: 400,
        message: "This event type does not allow cancellations",
      });
    }
  }

  const isReasonRequired = isCancellationReasonRequired(
    bookingToDelete.eventType?.requiresCancellationReason,
    isCancellationUserHost
  );

  if (
    !platformClientId &&
    !cancellationReason?.trim() &&
    isReasonRequired &&
    !skipCancellationReasonValidation
  ) {
    throw new HttpError({
      statusCode: 400,
      message: "Cancellation reason is required",
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
      (await getOrgMembershipRepository().isLoggedInUserOrgAdminOfBookingHost(
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

  const teamId = await getTeamIdFromEventType({
    eventType: {
      team: { id: bookingToDelete.eventType?.team?.id ?? null },
      parentId: bookingToDelete?.eventType?.parentId ?? null,
    },
  });
  const triggerForUser = !teamId || (teamId && bookingToDelete.eventType?.parentId);
  const organizerUserId = triggerForUser ? bookingToDelete.userId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });

  const isBookingAuditEnabled = orgId
    ? await getTeamFeatureRepository().checkIfTeamHasFeature(orgId, "booking-audit")
    : false;

  const organizer = await userRepository.findByIdOrThrow({
    id: bookingToDelete.userId,
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

  const ownerProfile = await profileRepository.findFirstByUserId({
    userId: bookingToDelete.userId,
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
    schedulingType: bookingToDelete.eventType?.schedulingType,
    hideBranding: bookingToDelete.eventTypeId
      ? await getEventTypeService().shouldHideBrandingForEventType(bookingToDelete.eventTypeId, {
          team: bookingToDelete.eventType?.team
            ? {
                hideBranding: bookingToDelete.eventType.team.hideBranding,
                parent: bookingToDelete.eventType.team.parent,
              }
            : null,
          owner: bookingToDelete.user
            ? {
                id: bookingToDelete.user.id,
                hideBranding: bookingToDelete.user.hideBranding,
                profiles: bookingToDelete.user.profiles ?? [],
              }
            : null,
        } satisfies EventTypeBrandingData)
      : false,
  };

  // If it's just an attendee of a booking then just remove them from that booking
  const result = await cancelAttendeeSeat(
    {
      seatReferenceUid: seatReferenceUid,
      bookingToDelete,
    },
    evt,
    bookingToDelete?.eventType?.metadata as EventTypeMetadata,
    {
      teamId,
      userId: organizerUserId,
      orgId,
      oAuthClientId: platformClientId,
      platformClientId,
      platformRescheduleUrl,
      platformCancelUrl,
      platformBookingUrl,
      skipNotifications,
    }
  );
  if (result)
    return {
      success: true,
      onlyRemovedAttendee: true,
      bookingId: bookingToDelete.id,
      bookingUid: bookingToDelete.uid,
      message: "Attendee successfully removed.",
      isPlatformManagedUserBooking: bookingToDelete.user.isPlatformManaged,
    } satisfies HandleCancelBookingResponse;

  const parsedMetadata = bookingMetadataSchema.safeParse(bookingToDelete.metadata || {});

  const workflows = await getAllWorkflowsFromEventType(bookingToDelete.eventType, bookingToDelete.userId);

  const creditService = new CreditService();

  if (!skipNotifications) {
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
  }

  let updatedBookings: {
    id: number;
    uid: string;
    workflowReminders: {
      id: number;
      referenceId: string | null;
      method: WorkflowMethods;
    }[];
    references: {
      type: string;
      credentialId: number | null;
      uid: string;
      externalCalendarId: string | null;
    }[];
    startTime: Date;
    endTime: Date;
  }[] = [];

  const bookingEventHandlerService = getBookingEventHandlerService();

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
    await bookingRepository.updateMany({
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
    const allUpdatedBookings = await bookingRepository.findManyIncludeWorkflowRemindersAndReferences({
      where: {
        recurringEventId: bookingToDelete.recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
    });
    updatedBookings = updatedBookings.concat(allUpdatedBookings);

    if (!skipNotifications) {
      try {
        const webhookProducer = getWebhookProducer();
        await webhookProducer.queueBookingCancelledWebhook({
          bookingUid: bookingToDelete.uid,
          eventTypeId: bookingToDelete.eventTypeId ?? undefined,
          teamId,
          userId: organizerUserId ?? undefined,
          orgId,
          oAuthClientId: platformClientId,
          platformClientId,
          platformRescheduleUrl,
          platformCancelUrl,
          platformBookingUrl,
          allRemainingBookings: !!allRemainingBookings,
        });
      } catch (e) {
        log.error(
          `Error queueing BOOKING_CANCELLED webhook for booking ${bookingToDelete.uid}`,
          safeStringify(e)
        );
      }
    }

    const operationId = uuidv4();
    await bookingEventHandlerService.onBulkBookingsCancelled({
      bookings: allUpdatedBookings.map((updatedRecurringBooking) => ({
        bookingUid: updatedRecurringBooking.uid,
        auditData: {
          cancellationReason: cancellationReason ?? null,
          status: {
            old: bookingToDelete.status,
            new: BookingStatus.CANCELLED,
          },
        },
      })),
      actor: actorToUse,
      organizationId: orgId ?? null,
      operationId,
      source: actionSource,
      isBookingAuditEnabled,
    });
  } else {
    const updatedBooking = await bookingRepository.updateIncludeWorkflowRemindersAndReferences({
      where: {
        uid: bookingToDelete.uid,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
        cancelledBy: cancelledBy,
        // Assume that canceling the booking is the last action
        iCalSequence: evt.iCalSequence || 100,
      },
    });

    updatedBookings.push(updatedBooking);

    if (!skipNotifications) {
      try {
        const webhookProducer = getWebhookProducer();
        await webhookProducer.queueBookingCancelledWebhook({
          bookingUid: bookingToDelete.uid,
          eventTypeId: bookingToDelete.eventTypeId ?? undefined,
          teamId,
          userId: organizerUserId ?? undefined,
          orgId,
          oAuthClientId: platformClientId,
          platformClientId,
          platformRescheduleUrl,
          platformCancelUrl,
          platformBookingUrl,
        });
      } catch (e) {
        log.error(
          `Error queueing BOOKING_CANCELLED webhook for booking ${bookingToDelete.uid}`,
          safeStringify(e)
        );
      }
    }

    await bookingEventHandlerService.onBookingCancelled({
      bookingUid: updatedBooking.uid,
      actor: actorToUse,
      organizationId: orgId ?? null,
      source: actionSource,
      auditData: {
        cancellationReason: cancellationReason ?? null,
        status: {
          old: bookingToDelete.status,
          new: BookingStatus.CANCELLED,
        },
      },
      isBookingAuditEnabled,
    });

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

  // Skip calendar event deletion when cancellation comes from a calendar subscription webhook
  // to avoid infinite loops (Google/Office365 → Cal.com → Google/Office365 → ...)
  if (!skipCalendarSyncTaskCancellation) {
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

      await eventManager.cancelEvent(evt, bookingToDelete.references, isBookingInRecurringSeries, {
        skipCrmDeletion: input.skipCrmDeletion,
      });
    } catch (error) {
      log.error(`Error deleting integrations`, safeStringify({ error }));
    }
  }

  // Always mark booking references as deleted for data consistency
  // (even when skipCalendarSyncTaskCancellation is true, since the external event is already deleted)
  try {
    await bookingReferenceRepository.updateManyByBookingId(bookingToDelete.id, { deleted: true });
  } catch (error) {
    log.error(`Error marking booking references as deleted`, safeStringify({ error }));
  }

  try {
    const webhookTriggerPromises = [];
    const workflowReminderPromises = [];

    for (const booking of updatedBookings) {
      // cancel delayed meeting webhooks for cancelled bookings
      webhookTriggerPromises.push(
        getWebhookProducer().cancelDelayedWebhooks({
          bookingId: booking.id,
          bookingUid: booking.uid,
          eventTypeId: bookingToDelete.eventTypeId ?? undefined,
          userId: organizerUserId ?? undefined,
          teamId,
          orgId,
        })
      );
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
    if (!skipNotifications && (!platformClientId || (platformClientId && arePlatformEmailsEnabled)))
      await sendCancelledEmailsAndSMS(
        evt,
        { eventName: bookingToDelete?.eventType?.eventName },
        bookingToDelete?.eventType?.metadata as EventTypeMetadata
      );
  } catch (error) {
    log.error("Error deleting event", error);
  }

  // Gate 4: abuse scoring — async, fail-open
  if (bookingToDelete.userId) {
    import("@calcom/features/abuse-scoring/lib/hooks")
      .then(({ onBookingCancelled }) => onBookingCancelled(bookingToDelete.userId!))
      .catch((err) => log.error("abuse-scoring: onBookingCancelled failed", err));
  }

  return {
    success: true,
    message: "Booking successfully cancelled.",
    onlyRemovedAttendee: false,
    bookingId: bookingToDelete.id,
    bookingUid: bookingToDelete.uid,
    isPlatformManagedUserBooking: bookingToDelete.user.isPlatformManaged,
  } satisfies HandleCancelBookingResponse;
}

type BookingCancelServiceDependencies = {
  userRepository: UserRepository;
  bookingRepository: BookingRepository;
  profileRepository: ProfileRepository;
  bookingReferenceRepository: BookingReferenceRepository;
  attendeeRepository: PrismaBookingAttendeeRepository;
};

/**
 * Takes care of cancelling bookings. This includes regular bookings, recurring bookings, seated bookings, etc.
 * Handles both individual booking cancellations and bulk cancellations for recurring events.
 */
export class BookingCancelService implements IBookingCancelService {
  constructor(private readonly deps: BookingCancelServiceDependencies) {}

  async cancelBooking(input: {
    bookingData: CancelRegularBookingData;
    bookingMeta?: CancelBookingMeta;
    actionSource: ValidActionSource;
  }) {
    const cancelBookingInput: CancelBookingInput = {
      bookingData: input.bookingData,
      ...(input.bookingMeta || {}),
      actionSource: input.actionSource,
    };

    return handler(cancelBookingInput, this.deps);
  }
}

export default handler;
