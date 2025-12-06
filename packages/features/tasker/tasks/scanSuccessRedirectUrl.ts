import { z } from "zod";

import { lockUser, LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

export const scanSuccessRedirectUrlSchema = z.object({
  eventTypeId: z.number(),
  successRedirectUrl: z.string(),
  userId: z.number(),
  createdAt: z.string().optional(),
});

const log = logger.getSubLogger({ prefix: ["[tasker] scanSuccessRedirectUrl"] });

export async function scanSuccessRedirectUrl(payload: string) {
  const { eventTypeId, successRedirectUrl, userId, createdAt } = scanSuccessRedirectUrlSchema.parse(
    JSON.parse(payload)
  );

  if (!successRedirectUrl) {
    log.info(`No successRedirectUrl to scan for event type ${eventTypeId}`);
    return;
  }

  if (!process.env.IFFY_API_KEY) {
    log.info("IFFY_API_KEY not set, skipping scan");
    return;
  }

  // Check if there's a newer scan task for this event type
  if (createdAt) {
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { successRedirectUrl: true },
    });

    // If the URL has changed since this task was created, skip this scan
    if (eventType?.successRedirectUrl !== successRedirectUrl) {
      log.info(`URL has changed for event type ${eventTypeId}, skipping stale scan`);
      return;
    }
  }

  const isToxic = await iffyScanUrl(successRedirectUrl, eventTypeId);

  if (isToxic) {
    log.warn(`Toxic redirect URL detected for event type ${eventTypeId}: ${successRedirectUrl}`);

    // Lock the user's account
    await lockUser("userId", String(userId), LockReason.SPAM_REDIRECT_URL);

    // Clear the toxic redirect URL from the event type
    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: { successRedirectUrl: "" },
    });

    log.info(`Cleared toxic redirect URL and locked user ${userId} for event type ${eventTypeId}`);
  }
}

export const iffyScanUrl = async (url: string, eventTypeId: number): Promise<boolean> => {
  try {
    const response = await fetch("https://api.iffy.com/api/v1/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.IFFY_API_KEY}`,
      },
      body: JSON.stringify({
        clientId: `Event type redirect URL - ${eventTypeId}`,
        name: "EventTypeRedirectUrl",
        entity: "SuccessRedirectUrl",
        content: url,
        passthrough: true,
      }),
    });

    const data = await response.json();
    return data.flagged === true;
  } catch (error) {
    log.error(`Error scanning redirect URL for event type ${eventTypeId}:`, error);
    return false;
  }
};
