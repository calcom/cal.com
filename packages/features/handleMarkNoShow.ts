import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { TNoShowInputSchema } from "@calcom/trpc/server/routers/publicViewer/noShow.schema";

const getResultPayload = async (attendees: { email: string; noShow: boolean }[]) => {
  if (attendees.length === 1) {
    const [attendee] = attendees;
    return {
      messageKey: attendee.noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show",
      attendees: [attendee],
    };
  }
  return {
    messageKey: "no_show_updated",
    attendees: attendees,
  };
};

type ResponsePayload = {
  attendees: { email: string; noShow: boolean }[];
  noShowHost: boolean;
  message: string;
  messageKey: string | undefined;
};

const logFailedResults = (results: PromiseSettledResult<any>[]) => {
  const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
  if (failed.length < 1) return;
  const failedMessage = failed.map((r) => r.reason);
  console.error("Failed to update no-show status", failedMessage.join(","));
};

const handleMarkNoShow = async ({ bookingUid, attendees, noShowHost }: TNoShowInputSchema) => {
  const responsePayload: ResponsePayload = {
    attendees: [],
    noShowHost: false,
    message: "Failed to update no-show status",
    messageKey: undefined,
  };
  try {
    const attendeeEmails = attendees?.map((attendee) => attendee.email) || [];
    if (attendees && attendeeEmails.length > 0) {
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

      const _attendees = results
        .filter((x) => x.status === "fulfilled")
        .map((x) => (x as PromiseFulfilledResult<{ noShow: boolean; email: string }>).value)
        .map((x) => ({ email: x.email, noShow: x.noShow }));

      const payload = await getResultPayload(_attendees);

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
      const webhooks = await new WebhookService({
        teamId: booking?.eventType?.teamId,
        userId: booking?.eventType?.userId,
        eventTypeId: booking?.eventType?.id,
        orgId,
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      });

      const t = await getTranslation("en", "common");
      const message = t(payload.messageKey, { x: payload.attendees[0]?.email || "User" });

      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        // @ts-expect-error payload is too booking specific, we need to refactor this
        message,
        bookingUid,
        bookingId: booking?.id,
      });

      responsePayload["attendees"] = payload.attendees;
      responsePayload["message"] = message;
      responsePayload["messageKey"] = payload.messageKey;
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

      responsePayload["noShowHost"] = true;
      responsePayload["message"] = "No-show status updated";
    }

    return responsePayload;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return { message: "Failed to update no-show status" };
  }
};

export default handleMarkNoShow;
