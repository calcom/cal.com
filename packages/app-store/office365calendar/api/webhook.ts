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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse notification payload
    const notification = NotificationSchema.parse(req.body);

    for (const change of notification.value) {
      log.info("Processing Outlook calendar change notification", {
        subscriptionId: change.subscriptionId,
        changeType: change.changeType,
        resource: change.resource,
        clientState: change.clientState,
      });

      // Extract credential ID and calendar ID from clientState
      if (!change.clientState) {
        log.warn("No clientState in notification, skipping");
        continue;
      }

      const [credentialId, calendarId] = change.clientState.split("-");
      if (!credentialId || !calendarId) {
        log.warn("Invalid clientState format, expected 'credentialId-calendarId'", {
          clientState: change.clientState,
        });
        continue;
      }

      try {
        // Get credential from database
        const credential = await prisma.credential.findUnique({
          where: { id: parseInt(credentialId) },
          include: { user: true },
        });

        if (!credential) {
          log.warn("Credential not found", { credentialId });
          continue;
        }

        // Clear cache entries for this credential
        // This will invalidate all cached availability for this Outlook credential
        await prisma.calendarCache.deleteMany({
          where: {
            credentialId: parseInt(credentialId),
          },
        });

        log.info("Cleared Outlook cache entries for credential", {
          credentialId,
          calendarId,
          changeType: change.changeType,
        });

        // Optionally: You could also refresh cache for common date ranges here
        // For now, we'll let it be refreshed on next request (lazy loading)
      } catch (error) {
        log.error("Error processing notification", {
          error,
          credentialId,
          calendarId,
          changeType: change.changeType,
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    log.error("Error handling webhook", { error });
    res.status(400).json({ error: "Invalid request" });
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
