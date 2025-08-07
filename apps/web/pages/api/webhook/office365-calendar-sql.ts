import type { NextApiRequest, NextApiResponse } from "next";

import { Office365CalendarWebhookService } from "@calcom/app-store/office365calendar/lib/Office365CalendarWebhookService";
import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["office365-calendar-sql-webhook"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validationToken = req.query.validationToken;
    if (validationToken) {
      log.info("Office365 webhook validation request");
      return res.status(200).send(validationToken);
    }

    const subscriptionId = req.body?.value?.[0]?.subscriptionId;
    if (!subscriptionId) {
      log.warn("No subscription ID in webhook payload");
      return res.status(200).json({ message: "ok" });
    }

    const { default: prisma } = await import("@calcom/prisma");
    const { SelectedCalendarRepository } = await import(
      "@calcom/lib/server/repository/SelectedCalendarRepository"
    );
    const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
    const eventRepo = new CalendarEventRepository(prisma);
    const selectedCalendarRepo = new SelectedCalendarRepository();
    const calendarCacheService = new CalendarCacheSqlService(
      subscriptionRepo,
      eventRepo,
      selectedCalendarRepo
    );

    const webhookService = new Office365CalendarWebhookService({
      subscriptionRepo,
      eventRepo,
      calendarCacheService,
      getCredentialForCalendarCache,
      logger: log,
    });

    const result = await webhookService.processWebhook(subscriptionId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    log.error("Office365 webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
