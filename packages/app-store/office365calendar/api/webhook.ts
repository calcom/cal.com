import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { OutlookCacheService } from "../lib/CacheService";
import { Office365CalendarService } from "../lib/CalendarService";
import { getOfficeAppKeys } from "../lib/getOfficeAppKeys";

const webhookSchema = z.object({
  subscriptionId: z.string(),
  changeType: z.enum(["created", "updated", "deleted"]),
  resource: z.string(),
  resourceData: z.object({
    "@odata.type": z.string(),
    id: z.string(),
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Validate webhook payload
    const payload = webhookSchema.parse(req.body);

    // Extract user ID and calendar ID from resource path
    // Example resource: "Users('user-id')/events('event-id')"
    const resourceMatch = payload.resource.match(/Users\('([^']+)'\)\/events\('([^']+)'\)/);
    if (!resourceMatch) {
      return res.status(400).json({ message: "Invalid resource format" });
    }

    const [, userId, eventId] = resourceMatch;

    // Get the cache service
    const cacheService = new OutlookCacheService();

    // Get the calendar service
    const { client_id, client_secret } = await getOfficeAppKeys();
    const calendarService = new Office365CalendarService({
      client_id,
      client_secret,
      userId: parseInt(userId),
    });

    // Get the affected calendar
    const calendars = await calendarService.listCalendars();
    const affectedCalendar = calendars.find((cal) => cal.externalId === eventId);

    if (!affectedCalendar) {
      return res.status(404).json({ message: "Calendar not found" });
    }

    // Invalidate cache for the affected date range
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Invalidate cache for the next 30 days
    for (let d = new Date(today); d <= thirtyDaysFromNow; d.setDate(d.getDate() + 1)) {
      await cacheService.invalidateCache(parseInt(userId), affectedCalendar.externalId, new Date(d));
    }

    // Recompute availability for the affected date range
    const availability = await calendarService.getAvailability(
      today.toISOString(),
      thirtyDaysFromNow.toISOString(),
      [affectedCalendar]
    );

    // Update cache with new availability data
    for (let d = new Date(today); d <= thirtyDaysFromNow; d.setDate(d.getDate() + 1)) {
      const dayAvailability = availability.filter(
        (slot) =>
          new Date(slot.start).toDateString() === d.toDateString() ||
          new Date(slot.end).toDateString() === d.toDateString()
      );

      await cacheService.setCachedAvailability(
        parseInt(userId),
        affectedCalendar.externalId,
        new Date(d),
        dayAvailability,
        payload.subscriptionId
      );
    }

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
} 