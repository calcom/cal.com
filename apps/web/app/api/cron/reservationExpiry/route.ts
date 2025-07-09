import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/client";

export async function handleReservationExpiry() {
  const currentTimeInUtc = dayjs.utc().toDate();
  let notificationsSent = 0;
  let expiredReservationsProcessed = 0;

  try {
    // Find expired reservations that need to be processed
    const expiredReservations = await prisma.selectedSlots.findMany({
      where: {
        releaseAt: { lt: currentTimeInUtc },
      },
      select: {
        id: true,
        uid: true,
        eventTypeId: true,
        userId: true,
        slotUtcStartDate: true,
        slotUtcEndDate: true,
        releaseAt: true,
      },
    });

    for (const reservation of expiredReservations) {
      try {
        // Get related data for webhook payload
        const eventType = await prisma.eventType.findUnique({
          where: { id: reservation.eventTypeId },
          select: {
            id: true,
            title: true,
            userId: true,
            teamId: true,
          },
        });

        const user = await prisma.user.findUnique({
          where: { id: reservation.userId },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        // Get organization ID for webhook queries
        const orgId = await getOrgIdFromMemberOrTeamId({
          memberId: eventType?.userId,
          teamId: eventType?.teamId,
        });

        const webhooks = await prisma.webhook.findMany({
          where: {
            active: true,
            eventTriggers: { has: WebhookTriggerEvents.RESERVATION_EXPIRED },
            OR: [
              // Event type specific webhooks
              { eventTypeId: reservation.eventTypeId },
              // User specific webhooks
              { userId: eventType?.userId },
              // Team specific webhooks
              { teamId: eventType?.teamId },
              // Organization webhooks
              ...(orgId && orgId !== eventType?.teamId ? [{ teamId: orgId }] : []),
            ],
          },
        });

        if (webhooks.length > 0) {
          const webhookData = {
            eventType: "RESERVATION_EXPIRED",
            reservationUid: reservation.uid,
            eventTypeId: reservation.eventTypeId,
            eventTypeTitle: eventType?.title,
            slotStart: reservation.slotUtcStartDate.toISOString(),
            slotEnd: reservation.slotUtcEndDate.toISOString(),
            userId: reservation.userId,
            userName: user?.name,
            userEmail: user?.email,
            expiredAt: reservation.releaseAt.toISOString(),
          };

          // Send webhooks
          const promises = webhooks.map((webhook) =>
            sendGenericWebhookPayload({
              secretKey: webhook.secret,
              triggerEvent: WebhookTriggerEvents.RESERVATION_EXPIRED,
              createdAt: new Date().toISOString(),
              webhook,
              data: webhookData,
            }).catch((e) => {
              logger.error(
                `Error executing webhook for event: ${WebhookTriggerEvents.RESERVATION_EXPIRED}, URL: ${webhook.subscriberUrl}, reservationUid: ${reservation.uid}`,
                safeStringify(e)
              );
            })
          );

          await Promise.all(promises);
          notificationsSent += webhooks.length;
        }

        // Clean up the expired reservation
        await prisma.selectedSlots.delete({
          where: { id: reservation.id },
        });

        expiredReservationsProcessed++;
      } catch (error) {
        logger.error(`Error processing expired reservation ${reservation.uid}`, safeStringify(error));
        // Continue processing other reservations even if one fails
      }
    }

    logger.info(
      `Reservation expiry cron completed. Processed: ${expiredReservationsProcessed}, Webhooks sent: ${notificationsSent}`
    );

    return {
      notificationsSent,
      expiredReservationsProcessed,
    };
  } catch (error) {
    logger.error("Error in reservation expiry cron job", safeStringify(error));
    return {
      error: "Internal server error",
      notificationsSent,
      expiredReservationsProcessed,
    };
  }
}

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const result = await handleReservationExpiry();

  if (result.error) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({
    notificationsSent: result.notificationsSent,
    expiredReservationsProcessed: result.expiredReservationsProcessed,
  });
}

export const POST = defaultResponderForAppDir(postHandler);
