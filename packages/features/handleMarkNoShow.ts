import { type TFunction } from "i18next";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { workflowSelect } from "@calcom/features/ee/workflows/lib/getAllWorkflows";
import type { ExtendedCalendarEvent } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowService } from "@calcom/lib/server/service/workflows";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema, type PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { TNoShowInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/markNoShow.schema";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";

import handleSendingAttendeeNoShowDataToApps from "./noShow/handleSendingAttendeeNoShowDataToApps";

export type NoShowAttendees = { email: string; noShow: boolean }[];

const buildResultPayload = async (
  bookingUid: string,
  attendeeEmails: string[],
  inputAttendees: NonNullable<TNoShowInputSchema["attendees"]>,
  t: TFunction
) => {
  const attendees = await updateAttendees(bookingUid, attendeeEmails, inputAttendees);

  if (attendees.length === 1) {
    const [attendee] = attendees;
    return {
      message: t(attendee.noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show", {
        x: attendee.email ?? "User",
      }),
      attendees: [attendee],
    };
  }
  return {
    message: t("no_show_updated"),
    attendees: attendees,
  };
};

const logFailedResults = (results: PromiseSettledResult<any>[]) => {
  const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
  if (failed.length < 1) return;
  const failedMessage = failed.map((r) => r.reason);
  console.error("Failed to update no-show status", failedMessage.join(","));
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

  getPayload() {
    return {
      attendees: this.attendees,
      noShowHost: this.noShowHost,
      message: this.message,
    };
  }
}

const handleMarkNoShow = async ({
  bookingUid,
  attendees,
  noShowHost,
  userId,
  locale,
  platformClientParams,
}: TNoShowInputSchema & {
  userId?: number;
  locale?: string;
  platformClientParams?: PlatformClientParams;
}) => {
  const responsePayload = new ResponsePayload();
  const t = await getTranslation(locale ?? "en", "common");

  try {
    const attendeeEmails = attendees?.map((attendee) => attendee.email) || [];

    if (attendees && attendeeEmails.length > 0) {
      await assertCanAccessBooking(bookingUid, userId);

      const payload = await buildResultPayload(bookingUid, attendeeEmails, attendees, t);

      const { webhooks, bookingId } = await getWebhooksService(
        bookingUid,
        platformClientParams?.platformClientId
      );

      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        bookingUid,
        bookingId,
        ...(platformClientParams ? platformClientParams : {}),
      });

      const booking = await prisma.booking.findUnique({
        where: { uid: bookingUid },
        select: {
          startTime: true,
          endTime: true,
          title: true,
          metadata: true,
          uid: true,
          location: true,
          destinationCalendar: true,
          smsReminderNumber: true,
          userPrimaryEmail: true,
          eventType: {
            select: {
              id: true,
              hideOrganizerEmail: true,
              customReplyToEmail: true,
              schedulingType: true,
              slug: true,
              title: true,
              metadata: true,
              parentId: true,
              teamId: true,
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
              parent: {
                select: {
                  teamId: true,
                },
              },
              workflows: {
                select: {
                  workflow: {
                    select: workflowSelect,
                  },
                },
              },
              owner: {
                select: {
                  hideBranding: true,
                  email: true,
                  name: true,
                  timeZone: true,
                  locale: true,
                },
              },
              team: {
                select: {
                  parentId: true,
                  name: true,
                  id: true,
                },
              },
            },
          },
          attendees: {
            select: {
              email: true,
              name: true,
              timeZone: true,
              locale: true,
              phoneNumber: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              destinationCalendar: true,
              timeZone: true,
              locale: true,
              username: true,
              timeFormat: true,
            },
          },
        },
      });

      if (booking?.eventType) {
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
            const team = !!booking.eventType?.team
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
                email: booking?.userPrimaryEmail || booking.user?.email || "Email-less",
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

            await WorkflowService.scheduleWorkflowsFilteredByTriggerEvent({
              workflows,
              smsReminderNumber: booking.smsReminderNumber,
              hideBranding: booking.eventType.owner?.hideBranding,
              calendarEvent,
              triggers: [WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED],
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
      await prisma.booking.update({
        where: {
          uid: bookingUid,
        },
        data: {
          noShowHost: true,
        },
      });

      responsePayload.setNoShowHost(true);
      responsePayload.setMessage(t("booking_no_show_updated"));
    }

    return responsePayload.getPayload();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw new HttpError({ statusCode: 500, message: "Failed to update no-show status" });
  }
};

const updateAttendees = async (
  bookingUid: string,
  attendeeEmails: string[],
  attendees: NonNullable<TNoShowInputSchema["attendees"]>
) => {
  const allAttendees = await prisma.attendee.findMany({
    where: {
      AND: [
        {
          booking: {
            uid: bookingUid,
          },
          email: {
            in: attendeeEmails,
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
    },
  });

  const allAttendeesMap = allAttendees.reduce((acc, attendee) => {
    acc[attendee.email] = attendee;
    return acc;
  }, {} as Record<string, { id: number; email: string }>);

  const updatePromises = attendees.map((attendee) => {
    const attendeeToUpdate = allAttendeesMap[attendee.email];
    if (!attendeeToUpdate) return;
    return prisma.attendee.update({
      where: { id: attendeeToUpdate.id },
      data: { noShow: attendee.noShow },
    });
  });

  const results = await Promise.allSettled(updatePromises);
  logFailedResults(results);

  return results
    .filter((x) => x.status === "fulfilled")
    .map((x) => (x as PromiseFulfilledResult<{ noShow: boolean; email: string }>).value)
    .map((x) => ({ email: x.email, noShow: x.noShow }));
};

const getWebhooksService = async (bookingUid: string, platformClientId?: string) => {
  const booking = await prisma.booking.findUnique({
    where: { uid: bookingUid },
    select: {
      id: true,
      eventType: {
        select: {
          id: true,
          teamId: true,
          userId: true,
        },
      },
    },
  });

  const orgId = await getOrgIdFromMemberOrTeamId({
    memberId: booking?.eventType?.userId,
    teamId: booking?.eventType?.teamId,
  });
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
  const booking = await bookingRepo.findBookingByUidAndUserId({ bookingUid, userId });

  if (!booking)
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

export default handleMarkNoShow;
