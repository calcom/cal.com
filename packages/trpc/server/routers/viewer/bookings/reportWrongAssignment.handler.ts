import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
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

  const bookingRepository = new BookingRepository(prisma);

  // Fetch the booking with all necessary relations
  const booking = await bookingRepository.findByUidForWrongAssignmentReport({ bookingUid });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  // Check if user has access to this booking
  const isHost = booking.userId === user.id;
  const isAttendee = booking.attendees.some((attendee) => attendee.email === user.email);

  if (!isHost && !isAttendee) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const teamId = booking.eventType?.team?.id ?? null;
  const orgId = booking.eventType?.team?.parentId ?? null;

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
            teamId: teamId,
          }
        : null,
    },
    report: {
      reportedBy: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      firstAssignmentReason: booking.assignmentReason[0]?.reasonString ?? null,
      guest: booking.attendees[0]?.email ?? null,
      host: {
        email: booking.user?.email ?? null,
        name: booking.user?.name ?? null,
      },
      correctAssignee: correctAssignee || null,
      additionalNotes: additionalNotes || null,
    },
  };

  try {
    const webhooks = await getWebhooks({
      userId: booking.userId,
      teamId,
      orgId,
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

    log.info(`Wrong assignment report sent for booking ${booking.uid}`, {
      teamId,
      userId: booking.userId,
      webhookCount: webhooks.length,
    });
  } catch (error) {
    log.error("Failed to send wrong assignment webhooks:", error);
  }

  return {
    success: true,
    message: "Wrong assignment reported successfully",
  };
};
