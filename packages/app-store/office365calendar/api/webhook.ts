import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

// Microsoft Graph notification schema
const NotificationSchema = z.object({
  value: z.array(
    z.object({
      subscriptionId: z.string(),
      clientState: z.string().optional(),
      changeType: z.enum(["created", "updated", "deleted"]),
      resource: z.string(),
      subscriptionExpirationDateTime: z.string(),
      resourceData: z
        .object({
          "@odata.type": z.string(),
          "@odata.id": z.string(),
          id: z.string().optional(),
        })
        .optional(),
    })
  ),
});

const log = logger.getSubLogger({ prefix: ["[api] office365-webhook"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle webhook validation
  if (req.method === "POST" && req.query.validationToken) {
    log.info("Webhook validation request received");
    return res.status(200).send(req.query.validationToken);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Validate webhook notification
    const notification = NotificationSchema.parse(req.body);

    log.info("Processing Outlook calendar change notification", {
      subscriptionId: notification.value?.[0]?.subscriptionId,
      changeType: notification.value?.[0]?.changeType,
      // Remove resource logging to avoid exposing sensitive information
    });

    for (const change of notification.value || []) {
      // Extract credential ID and calendar ID from clientState
      if (!change.clientState) {
        log.warn("Missing clientState in webhook notification");
        continue;
      }

      const [credentialIdStr, calendarId] = change.clientState.split("-");
      if (!credentialIdStr || !calendarId) {
        log.warn("Invalid clientState format, expected 'credentialId-calendarId'", {
          clientState: change.clientState,
        });
        continue;
      }

      // Get credential from database
      const credentialId = parseInt(credentialIdStr);

      // Validate that credentialId is a valid number
      if (!credentialId || isNaN(credentialId)) {
        log.warn("Invalid credential ID in webhook", { credentialIdStr });
        continue;
      }

      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
        // Only select specific fields needed, avoiding user data exposure
        select: {
          id: true,
          key: true,
          userId: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!credential) {
        log.warn("Credential not found for webhook", { credentialId });
        continue;
      }

      log.info("Invalidating cache for calendar", {
        credentialId,
        calendarId: `${calendarId.substring(0, 10)}...`, // Sanitize calendar ID logging
      });

      // Invalidate cache entries for this credential
      await prisma.calendarCache.deleteMany({
        where: {
          credentialId: credentialId,
        },
      });

      log.info("Cache invalidated successfully", { credentialId });

      // Optionally: You could also refresh cache for common date ranges here
      // For now, we'll let it be refreshed on next request (lazy loading)
    }

    res.status(200).json({ received: true });
  } catch (error) {
    log.error("Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Export configuration for webhook validation
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
