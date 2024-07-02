import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/client";

import type { TNoShowInputSchema } from "./noShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

const getResultPayload = async (attendees: { email: string; noShow: boolean }[]) => {
  if (attendees.length === 1) {
    const [attendee] = attendees;
    return {
      message: attendee.noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show",
      attendees: [attendee],
    };
  }
  return { message: "no_show_updated", attendees: attendees };
};

const logFailedResults = (results: PromiseSettledResult<any>[]) => {
  const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
  if (failed.length < 1) return;
  const failedMessage = failed.map((r) => r.reason);
  console.error("Failed to update no-show status", failedMessage.join(","));
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, attendees } = input;

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
      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        // @ts-expect-error payload is too booking specific, we need to refactor this
        message: t(payload.message, { x: payload.attendees[0]?.email || "User" }),
        bookingUid,
        bookingId: booking?.id,
      });
      return payload;
    }
    await prisma.booking.update({
      where: {
        uid: bookingUid,
      },
      data: {
        noShowHost: true,
      },
    });
    return { message: "No-show status updated", noShowHost: true };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    return { message: "Failed to update no-show status" };
  }
};

export default noShowHandler;
