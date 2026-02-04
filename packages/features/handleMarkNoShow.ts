import process from "node:process";
import type { Actor } from "@calcom/features/booking-audit/lib/dto/types";
import {
  buildActorEmail,
  getUniqueIdentifier,
  makeGuestActor,
  makeUserActor,
} from "@calcom/features/booking-audit/lib/makeActor";
import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingEventHandlerService } from "@calcom/features/bookings/di/BookingEventHandlerService.container";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { getAllWorkflowsFromEventType } from "@calcom/features/ee/workflows/lib/getAllWorkflowsFromEventType";
import type { ExtendedCalendarEvent } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { WorkflowService } from "@calcom/features/ee/workflows/lib/service/WorkflowService";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema, type PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { TNoShowInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/markNoShow.schema";
import type { TFunction } from "i18next";
import handleSendingAttendeeNoShowDataToApps from "./noShow/handleSendingAttendeeNoShowDataToApps";

export type NoShowAttendees = { email: string; noShow: boolean }[];

type GetWebhooksServiceArgs = {
  platformClientId?: string;
  orgId: number | undefined;
  booking: {
    id: number;
    eventType: {
      id: number;
      teamId: number | null;
      userId: number | null;
    } | null;
  } | null;
};

type HandleMarkHostNoShowArgs = {
  bookingUid: string;
  noShowHost: boolean;
  actionSource: ValidActionSource;
  locale?: string;
  platformClientParams?: PlatformClientParams;
  impersonatedByUserUuid?: string;
};

type HandleMarkAttendeesAndHostNoShowArgs = {
  bookingUid: string;
  attendees?: { email: string; noShow: boolean }[];
  noShowHost?: boolean;
  userId: number;
  userUuid: string;
  actionSource: ValidActionSource;
  locale?: string;
  platformClientParams?: PlatformClientParams;
  impersonatedByUserUuid?: string;
};

type HandleMarkNoShowArgs = {
  bookingUid: string;
  attendees?: { email: string; noShow: boolean }[];
  noShowHost?: boolean;
  userId?: number;
  userUuid?: string;
  actionSource: ValidActionSource;
  locale?: string;
  platformClientParams?: PlatformClientParams;
  actor: Actor;
  impersonatedByUserUuid?: string;
};

const buildResultPayload = async ({
  attendees,
  t,
  emailToAttendeeMap,
}: {
  attendees: NonNullable<TNoShowInputSchema["attendees"]>;
  t: TFunction;
  emailToAttendeeMap: EmailToAttendeeMap;
}): Promise<{message: string; attendees: NoShowAttendees}> => {
  const updatedAttendees = await updateAttendees({ attendees, emailToAttendeeMap });

  if (updatedAttendees.length === 1) {
    const [attendee] = updatedAttendees;
    return {
      message: t(attendee.noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show", {
        x: attendee.email ?? "User",
      }),
      attendees: [attendee],
    };
  }
  return {
    message: t("no_show_updated"),
    attendees: updatedAttendees,
  };
};

const logFailedResults = (results: PromiseSettledResult<unknown>[]) => {
  const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
  if (failed.length < 1) return;
  const failedMessage = failed.map((r) => r.reason);
  console.error("Failed to update no-show status", failedMessage.join(","));
};

type ResponsePayloadResult = {
  attendees: NoShowAttendees;
  noShowHost: boolean;
  message: string;
};

class ResponsePayload {
  attendees: NoShowAttendees;
  noShowHost: boolean;
  message: string;

  constructor() {
    this.attendees = [];
    this.noShowHost = false;
    this.message = "";
  }

  setAttendees(attendees: { email: string; noShow: boolean }[]) {
    this.attendees = attendees;
  }

  setNoShowHost(noShowHost: boolean) {
    this.noShowHost = noShowHost;
  }

  setMessage(message: string) {
    this.message = message;
  }

  getPayload(): ResponsePayloadResult {
    return {
      attendees: this.attendees,
      noShowHost: this.noShowHost,
      message: this.message,
    };
  }
}

type EmailToAttendeeMap = Record<string, { id: number; email: string; noShow: boolean | null }>;

const getBookingAttendeesFromEmails = async (
  bookingUid: string,
  emails: string[]
): Promise<EmailToAttendeeMap> => {
  const attendeeRepository = new AttendeeRepository(prisma);
  const dbAttendees = await attendeeRepository.findByBookingUidAndEmails({ bookingUid, emails });
  const emailToAttendeeMap = dbAttendees.reduce((acc, a) => {
    acc[a.email] = a;
    return acc;
  }, {} as EmailToAttendeeMap);
  return emailToAttendeeMap;
};

async function fireNoShowUpdated({
  updatedNoShowHost,
  hostUserUuid,
  booking,
  updatedAttendees,
  emailToAttendeeMap,
  actor,
  orgId,
  actionSource,
  impersonatedByUserUuid,
}: {
  updatedNoShowHost?: boolean;
  hostUserUuid?: string;
  booking: {
    uid: string;
    noShowHost: boolean | null;
  };
  updatedAttendees?: NoShowAttendees;
  emailToAttendeeMap: EmailToAttendeeMap;
  actor: Actor;
  orgId: number | null;
  actionSource: ValidActionSource;
  impersonatedByUserUuid?: string;
}): Promise<void> {
  const auditData: {
    host?: { userUuid: string; noShow: { old: boolean | null; new: boolean } };
    attendeesNoShow?: Array<{ attendeeEmail: string; noShow: { old: boolean | null; new: boolean } }>;
  } = {};

  if (updatedNoShowHost !== undefined && hostUserUuid) {
    auditData.host = {
      userUuid: hostUserUuid,
      noShow: { old: booking.noShowHost, new: updatedNoShowHost },
    };
  }

  if (updatedAttendees) {
    auditData.attendeesNoShow = [];
    for (const attendee of updatedAttendees) {
      const dbAttendee = emailToAttendeeMap[attendee.email];
      if (dbAttendee) {
        auditData.attendeesNoShow.push({
          attendeeEmail: attendee.email,
          noShow: { old: dbAttendee.noShow ?? null, new: attendee.noShow },
        });
      }
    }
  }

  const bookingEventHandlerService = getBookingEventHandlerService();

  const isSomethingChanged = auditData.host || (auditData.attendeesNoShow && auditData.attendeesNoShow.length > 0);
  if (isSomethingChanged) {
    const auditContext = impersonatedByUserUuid ? { impersonatedBy: impersonatedByUserUuid } : undefined;
    await bookingEventHandlerService.onNoShowUpdated({
      bookingUid: booking.uid,
      actor,
      organizationId: orgId ?? null,
      source: actionSource,
      auditData,
      context: auditContext,
    });
  }
}

const handleMarkNoShow = async ({
  bookingUid,
  attendees,
  noShowHost,
  userId,
  actor,
  locale,
  platformClientParams,
  actionSource,
  impersonatedByUserUuid,
}: HandleMarkNoShowArgs): Promise<ResponsePayloadResult> => {
  const responsePayload = new ResponsePayload();
  const t = await getTranslation(locale ?? "en", "common");

  try {
    const attendeeEmails = attendees?.map((attendee) => attendee.email) || [];

    const bookingRepository = new BookingRepository(prisma);
    const booking = await bookingRepository.findByUidIncludeEventTypeAttendeesAndUser({
      bookingUid,
    });

    if (!booking) {
      throw new HttpError({ statusCode: 404, message: "Booking not found" });
    }

    const [orgId, emailToAttendeeMap] = await Promise.all([
      getOrgIdFromMemberOrTeamId({
        memberId: booking.eventType?.userId,
        teamId: booking.eventType?.teamId || booking.eventType?.parent?.teamId,
      }),
      getBookingAttendeesFromEmails(bookingUid, attendeeEmails),
    ]);

    let successfullyUpdatedAttendees: NoShowAttendees | undefined;

    if (attendees && attendeeEmails.length > 0) {
      await assertCanAccessBooking(bookingUid, userId);

      const payload = await buildResultPayload({
        attendees,
        t,
        emailToAttendeeMap,
      });
      successfullyUpdatedAttendees = payload.attendees;
      const { webhooks, bookingId } = await getWebhooksService({
        platformClientId: platformClientParams?.platformClientId,
        orgId,
        booking,
      });

      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        bookingUid,
        bookingId,
        ...(platformClientParams ? platformClientParams : {}),
      });

      if (booking.eventType) {
        const workflows = await getAllWorkflowsFromEventType(booking.eventType, userId);

        if (workflows.length > 0) {
          const tOrganizer = await getTranslation(booking.user?.locale ?? "en", "common");
          // Cache translations to avoid requesting multiple times.
          const translations = new Map();
          const attendeesListPromises = booking.attendees.map(async (attendee) => {
            const locale = attendee.locale ?? "en";
            let translate = translations.get(locale);
            if (!translate) {
              translate = await getTranslation(locale, "common");
              translations.set(locale, translate);
            }
            return {
              name: attendee.name,
              email: attendee.email,
              timeZone: attendee.timeZone,
              phoneNumber: attendee.phoneNumber,
              language: {
                translate,
                locale,
              },
            };
          });
          const attendeesList = await Promise.all(attendeesListPromises);
          try {
            const organizer = booking.user || booking.eventType.owner;
            const parsedMetadata = bookingMetadataSchema.safeParse(booking.metadata);
            const metadata =
              parsedMetadata.success && parsedMetadata.data?.videoCallUrl
                ? { videoCallUrl: parsedMetadata.data.videoCallUrl }
                : undefined;
            const bookerUrl = await getBookerBaseUrl(booking.eventType?.team?.parentId ?? null);
            const destinationCalendar = booking.destinationCalendar
              ? [booking.destinationCalendar]
              : booking.user?.destinationCalendar
                ? [booking.user?.destinationCalendar]
                : [];
            const team = booking.eventType?.team
              ? {
                  name: booking.eventType.team.name,
                  id: booking.eventType.team.id,
                  members: [],
                }
              : undefined;

            const calendarEvent: ExtendedCalendarEvent = {
              type: booking.eventType.slug,
              title: booking.title,
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              organizer: {
                id: booking.user?.id,
                email: booking.userPrimaryEmail || booking.user?.email || "Email-less",
                name: booking.user?.name || "Nameless",
                username: booking.user?.username || undefined,
                timeZone: organizer?.timeZone || "UTC",
                timeFormat: getTimeFormatStringFromUserTimeFormat(booking.user?.timeFormat),
                language: {
                  translate: tOrganizer,
                  locale: booking.user?.locale ?? "en",
                },
              },
              attendees: attendeesList,
              uid: booking.uid,
              location: booking.location || "",
              eventType: {
                slug: booking.eventType.slug,
                schedulingType: booking.eventType.schedulingType,
                hosts: booking.eventType.hosts,
              },
              destinationCalendar,
              bookerUrl,
              metadata,
              rescheduleReason: null,
              cancellationReason: null,
              hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
              eventTypeId: booking.eventType?.id,
              customReplyToEmail: booking.eventType?.customReplyToEmail,
              team,
            };

            const creditService = new CreditService();

            await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
              workflows,
              smsReminderNumber: booking.smsReminderNumber,
              hideBranding: booking.eventType.owner?.hideBranding,
              calendarEvent,
              triggers: [WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED],
              creditCheckFn: creditService.hasAvailableCredits.bind(creditService),
            });
          } catch (error) {
            logger.error("Error while scheduling workflow reminders for booking no-show updated", error);
          }
        }
      }

      responsePayload.setAttendees(payload.attendees);
      responsePayload.setMessage(payload.message);

      await handleSendingAttendeeNoShowDataToApps(bookingUid, attendees);
    }

    if (noShowHost) {
      await bookingRepository.updateNoShowHost({ bookingUid, noShowHost: true });
      responsePayload.setNoShowHost(true);
      responsePayload.setMessage(t("booking_no_show_updated"));
    }

    await fireNoShowUpdated({
      booking,
      updatedNoShowHost: noShowHost,
      hostUserUuid: booking.user?.uuid,
      updatedAttendees: successfullyUpdatedAttendees,
      emailToAttendeeMap,
      actor,
      orgId: orgId ?? null,
      actionSource,
      impersonatedByUserUuid,
    });

    return responsePayload.getPayload();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw new HttpError({ statusCode: 500, message: "Failed to update no-show status" });
  }
};

const updateAttendees = async ({
  attendees,
  emailToAttendeeMap,
}: {
  attendees: NonNullable<TNoShowInputSchema["attendees"]>;
  emailToAttendeeMap: EmailToAttendeeMap; 
}): Promise<NoShowAttendees> => {
  const attendeeRepository = new AttendeeRepository(prisma);
  const updatePromises = attendees.map((attendee) => {
    const attendeeToUpdate = emailToAttendeeMap[attendee.email];
    if (!attendeeToUpdate) return null;
    return attendeeRepository.updateNoShow({
      where: { attendeeId: attendeeToUpdate.id },
      data: { noShow: attendee.noShow },
    });
  });

  const results = await Promise.allSettled(updatePromises);
  logFailedResults(results);

  return results
    .filter((x) => x.status === "fulfilled")
    .map((x) => (x as PromiseFulfilledResult<{ noShow: boolean; email: string } | null>).value)
    .filter((x): x is { noShow: boolean; email: string } => x !== null)
    .map((x) => ({ email: x.email, noShow: x.noShow }));
};

const getWebhooksService = async ({ platformClientId, orgId, booking }: GetWebhooksServiceArgs) => {
  const webhooks = await WebhookService.init({
    teamId: booking?.eventType?.teamId,
    userId: booking?.eventType?.userId,
    eventTypeId: booking?.eventType?.id,
    orgId,
    triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
    oAuthClientId: platformClientId,
  });

  return { webhooks, bookingId: booking?.id };
};

const assertCanAccessBooking = async (bookingUid: string, userId?: number) => {
  if (!userId) throw new HttpError({ statusCode: 401 });

  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findByUidIncludeEventTypeAndReferences({ bookingUid });
  const bookingAccessService = new BookingAccessService(prisma);
  const isAuthorized = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId,
    bookingUid,
  });

  if (!isAuthorized)
    throw new HttpError({ statusCode: 403, message: "You are not allowed to access this booking" });

  const isUpcoming = new Date(booking.endTime) >= new Date();
  const isOngoing = isUpcoming && new Date() >= new Date(booking.startTime);
  const isBookingInPast = new Date(booking.endTime) < new Date();
  if (!isBookingInPast && !isOngoing) {
    throw new HttpError({
      statusCode: 403,
      message: "Cannot mark no-show before the meeting has started.",
    });
  }
};

export const handleMarkHostNoShow = async ({
  bookingUid,
  noShowHost,
  actionSource,
  locale,
  platformClientParams,
  impersonatedByUserUuid,
}: HandleMarkHostNoShowArgs): Promise<ResponsePayloadResult> => {
  const actorEmail = buildActorEmail({
    identifier: getUniqueIdentifier({ prefix: "attendee" }),
    actorType: "guest",
  });

  // TODO: Accept attendee email/name from the caller to track which attendee triggered this action
  const actor = makeGuestActor({ email: actorEmail, name: null });

  return handleMarkNoShow({
    bookingUid,
    noShowHost,
    actor,
    actionSource,
    locale,
    platformClientParams,
    impersonatedByUserUuid,
  });
};

/**
 * Handle marking attendees as no-show.
 * This is called from authenticated endpoints where a logged-in host marks attendees as absent.
 * Requires userId and userUuid for proper authorization and audit tracking.
 */
export const handleMarkAttendeesAndHostNoShow = async ({
  bookingUid,
  attendees,
  noShowHost,
  userId,
  userUuid,
  actionSource,
  locale,
  platformClientParams,
  impersonatedByUserUuid,
}: HandleMarkAttendeesAndHostNoShowArgs): Promise<ResponsePayloadResult> => {
  const actor = makeUserActor(userUuid);

  return handleMarkNoShow({
    bookingUid,
    attendees,
    noShowHost,
    userId,
    actor,
    actionSource,
    locale,
    platformClientParams,
    impersonatedByUserUuid,
  });
};

export default handleMarkNoShow;
