import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TReportWrongAssignmentInputSchema } from "./reportWrongAssignment.schema";

type ReportWrongAssignmentOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportWrongAssignmentInputSchema;
};

const log = logger.getSubLogger({ prefix: ["reportWrongAssignmentHandler"] });

export const reportWrongAssignmentHandler = async ({ ctx, input }: ReportWrongAssignmentOptions) => {
  const { user } = ctx;
  const { bookingUid, correctAssignee, additionalNotes } = input;

  const t = await getTranslation(user.locale ?? "en", "common");
  const bookingRepo = new BookingRepository(prisma);
  const wrongAssignmentReportRepo = new WrongAssignmentReportRepository(prisma);
  const bookingAccessService = new BookingAccessService(prisma);

  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const booking = await bookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason({ bookingUid });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const teamId = booking.eventType?.teamId || null;
  const bookingUserId = booking.user?.id || null;

  const assignmentReason = booking.assignmentReason?.[0];
  const guestEmail = booking.attendees[0]?.email || "";
  const hostEmail = booking.user?.email || "";
  const hostName = booking.user?.name || null;
  const routingFormId = booking.routedFromRoutingFormReponse?.formId || null;

  const alreadyReported = await wrongAssignmentReportRepo.existsByBookingUid(booking.uid);

  if (alreadyReported) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: t("wrong_assignment_already_reported"),
    });
  }

  let report: { id: string };
  try {
    report = await wrongAssignmentReportRepo.createReport({
      bookingUid: booking.uid,
      reportedById: user.id,
      correctAssignee: correctAssignee || null,
      additionalNotes,
      teamId,
      routingFormId,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: t("wrong_assignment_already_reported"),
      });
    }
    throw error;
  }

  const webhookPayload = {
    booking: {
      uid: booking.uid,
      id: booking.id,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      eventType: booking.eventType
        ? {
            id: booking.eventType.id,
            title: booking.eventType.title,
            slug: booking.eventType.slug,
            teamId: booking.eventType.teamId,
          }
        : null,
    },
    report: {
      reportedBy: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      routingReason: assignmentReason?.reasonString || null,
      guest: guestEmail,
      host: {
        email: hostEmail,
        name: hostName,
      },
      correctAssignee: correctAssignee || null,
      additionalNotes: additionalNotes || null,
    },
  };

  try {
    const webhooks = await getWebhooks({
      userId: bookingUserId,
      teamId,
      triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
    });

    const webhookPromises = webhooks.map((webhook) =>
      sendGenericWebhookPayload({
        secretKey: webhook.secret,
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        createdAt: new Date().toISOString(),
        webhook,
        data: webhookPayload,
      }).catch((error) => {
        log.error(`Failed to send webhook to ${webhook.subscriberUrl}:`, error);
        return { ok: false, status: 0 };
      })
    );

    await Promise.allSettled(webhookPromises);

    log.info(`Wrong assignment report sent for booking ${bookingUid}`, {
      teamId,
      userId: bookingUserId,
      webhookCount: webhooks.length,
    });
  } catch (error) {
    log.error("Failed to send wrong assignment webhooks:", error);
  }

  return {
    success: true,
    message: "Wrong assignment reported successfully",
    reportId: report.id,
  };
};
