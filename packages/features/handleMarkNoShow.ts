import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/client";
import type { TNoShowInputSchema } from "@calcom/trpc/server/routers/loggedInViewer/markNoShow.schema";

const getResultPayload = async (
  bookingUid: string,
  attendeeEmails: string[],
  inputAttendees: NonNullable<TNoShowInputSchema["attendees"]>
) => {
  const attendees = await getAttendees(bookingUid, attendeeEmails, inputAttendees);

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

const logFailedResults = (results: PromiseSettledResult<any>[]) => {
  const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
  if (failed.length < 1) return;
  const failedMessage = failed.map((r) => r.reason);
  console.error("Failed to update no-show status", failedMessage.join(","));
};

class ResponsePayloadWrapper {
  attendees: { email: string; noShow: boolean }[];
  noShowHost: boolean;
  message: string;
  messageKey: string | undefined;

  constructor() {
    this.attendees = [];
    this.noShowHost = false;
    this.message = "Failed to update no-show status";
    this.messageKey = undefined;
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

  setMessageKey(messageKey: string | undefined) {
    this.messageKey = messageKey;
  }

  getPayload() {
    return {
      attendees: this.attendees,
      noShowHost: this.noShowHost,
      message: this.message,
      messageKey: this.messageKey,
    };
  }
}

const handleMarkNoShow = async ({
  bookingUid,
  attendees,
  noShowHost,
  userId,
}: TNoShowInputSchema & { userId?: number }) => {
  const responsePayload = new ResponsePayloadWrapper();

  try {
    const attendeeEmails = attendees?.map((attendee) => attendee.email) || [];

    if (attendees && attendeeEmails.length > 0) {
      await checkCanAccessBooking(bookingUid, userId);

      const payload = await getResultPayload(bookingUid, attendeeEmails, attendees);

      const { webhooks, bookingId } = await getWebhooksService(bookingUid);

      const t = await getTranslation("en", "common");
      const message = t(payload.messageKey, { x: payload.attendees[0]?.email || "User" });

      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        // @ts-expect-error payload is too booking specific, we need to refactor this
        message,
        bookingUid,
        bookingId,
      });

      responsePayload.setAttendees(payload.attendees);
      responsePayload.setMessage(message);
      responsePayload.setMessageKey(payload.messageKey);
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
      responsePayload.setMessage("No-show status updated");
    }

    return responsePayload.getPayload();
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw new HttpError({ statusCode: 500, message: "Failed to update no-show status" });
  }
};

const getAttendees = async (
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

const getWebhooksService = async (bookingUid: string) => {
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

  return { webhooks, bookingId: booking?.id };
};

const checkCanAccessBooking = async (bookingUid: string, userId?: number) => {
  if (!userId) throw new HttpError({ statusCode: 401 });

  const booking = await await prisma.booking.findFirst({
    where: {
      uid: bookingUid,
      OR: [
        { userId: userId },
        {
          eventType: {
            hosts: {
              some: {
                userId,
              },
            },
          },
        },
        {
          eventType: {
            users: {
              some: {
                id: userId,
              },
            },
          },
        },
        {
          eventType: {
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                  role: {
                    in: ["ADMIN", "OWNER"],
                  },
                },
              },
            },
          },
        },
      ],
    },
  });

  if (!booking)
    throw new HttpError({ statusCode: 403, message: "You are not allowed to access this booking" });
};

export default handleMarkNoShow;
