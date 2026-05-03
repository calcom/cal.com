import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { WebhookService } from "@calcom/features/webhooks/lib/WebhookService";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/i18n/server";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { bookingMetadataSchema, type PlatformClientParams } from "@calcom/prisma/zod-utils";
import type { TFunction } from "i18next";
import { z } from "zod";

export const ZNoShowInputSchema = z
  .object({
    bookingUid: z.string(),
    attendees: z
      .array(
        z.object({
          email: z.string(),
          noShow: z.boolean(),
        })
      )
      .optional(),
    noShowHost: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return (data.attendees && data.attendees.length > 0) || data.noShowHost !== undefined;
    },
    {
      message: "At least one of 'attendees' or 'noShowHost' must be provided",
      path: ["attendees", "noShowHost"],
    }
  );

export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;

import handleSendingAttendeeNoShowDataToApps from "./noShow/handleSendingAttendeeNoShowDataToApps";

export type NoShowAttendees = { email: string; noShow: boolean }[];

type GetWebhooksServiceArgs = {
  platformClientId?: string;
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
  locale?: string;
  platformClientParams?: PlatformClientParams;
};

type HandleMarkAttendeesAndHostNoShowArgs = {
  bookingUid: string;
  attendees?: { email: string; noShow: boolean }[];
  noShowHost?: boolean;
  userId: number;
  locale?: string;
  platformClientParams?: PlatformClientParams;
};

type HandleMarkNoShowArgs = {
  bookingUid: string;
  attendees?: { email: string; noShow: boolean }[];
  noShowHost?: boolean;
  userId?: number;
  locale?: string;
  platformClientParams?: PlatformClientParams;
};

const buildResultPayload = async ({
  attendees,
  t,
  emailToAttendeeMap,
}: {
  attendees: NonNullable<TNoShowInputSchema["attendees"]>;
  t: TFunction;
  emailToAttendeeMap: EmailToAttendeeMap;
}): Promise<{ message: string; attendees: NoShowAttendees }> => {
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

const handleMarkNoShow = async ({
  bookingUid,
  attendees,
  noShowHost,
  userId,
  locale,
  platformClientParams,
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

    const emailToAttendeeMap = await getBookingAttendeesFromEmails(bookingUid, attendeeEmails);

    if (attendees && attendeeEmails.length > 0) {
      await assertCanAccessBooking(bookingUid, userId);

      const payload = await buildResultPayload({
        attendees,
        t,
        emailToAttendeeMap,
      });
      const { webhooks, bookingId } = await getWebhooksService({
        platformClientId: platformClientParams?.platformClientId,
        booking,
      });

      await webhooks.sendPayload({
        ...payload,
        /** We send webhook message pre-translated, on client we already handle this */
        bookingUid,
        bookingId,
        ...(platformClientParams ? platformClientParams : {}),
      });

      responsePayload.setAttendees(payload.attendees);
      responsePayload.setMessage(payload.message);

      await handleSendingAttendeeNoShowDataToApps(bookingUid, attendees);
    }

    if (noShowHost !== undefined) {
      await bookingRepository.updateNoShowHost({ bookingUid, noShowHost });
      responsePayload.setNoShowHost(noShowHost);
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

const getWebhooksService = async ({ platformClientId, booking }: GetWebhooksServiceArgs) => {
  const webhooks = await WebhookService.init({
    teamId: null,
    userId: booking?.eventType?.userId,
    eventTypeId: booking?.eventType?.id,
    orgId: undefined,
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
  locale,
  platformClientParams,
}: HandleMarkHostNoShowArgs): Promise<ResponsePayloadResult> => {
  return handleMarkNoShow({
    bookingUid,
    noShowHost,
    locale,
    platformClientParams,
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
  locale,
  platformClientParams,
}: HandleMarkAttendeesAndHostNoShowArgs): Promise<ResponsePayloadResult> => {
  return handleMarkNoShow({
    bookingUid,
    attendees,
    noShowHost,
    userId,
    locale,
    platformClientParams,
  });
};

export default handleMarkNoShow;
