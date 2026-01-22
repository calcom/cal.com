import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
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
  const {
    bookingUid,
    bookingId,
    bookingTitle,
    bookingStartTime,
    bookingEndTime,
    bookingStatus,
    eventTypeId,
    eventTypeTitle,
    eventTypeSlug,
    teamId,
    userId,
    routingReason,
    guestEmail,
    hostEmail,
    hostName,
    correctAssignee,
    additionalNotes,
  } = input;

  const bookingAccessService = new BookingAccessService(prisma);

  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  // Get orgId from team if teamId exists
  let orgId: number | null = null;
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { parentId: true },
    });
    orgId = team?.parentId ?? null;
  }

  const webhookPayload = {
    booking: {
      uid: bookingUid,
      id: bookingId,
      title: bookingTitle,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      status: bookingStatus,
      eventType:
        eventTypeId && eventTypeTitle && eventTypeSlug
          ? {
              id: eventTypeId,
              title: eventTypeTitle,
              slug: eventTypeSlug,
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
      firstAssignmentReason: routingReason,
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
      userId: userId,
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

    log.info(`Wrong assignment report sent for booking ${bookingUid}`, {
      teamId,
      userId: userId,
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
