import type { NextApiRequest, NextApiResponse } from "next";

import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { prisma } from "@calcom/prisma";

import Office365CalendarService from "../lib/CalendarService";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Handle validation token (for subscription creation)
  if (req.method === "GET" && req.query.validationToken) {
    res.status(200).send(req.query.validationToken as string);
    return;
  }

  // 2. Handle notifications
  if (req.method === "POST") {
    // Fetch all office365_calendar credentials once
    const credentials = await prisma.credential.findMany({
      where: { type: "office365_calendar" },
      select: { id: true, userId: true, key: true },
    });
    const credentialMap = new Map(credentials.map((c) => [String(c.id), c]));

    const notifications = req.body.value;
    for (const notification of notifications) {
      const { resource } = notification;
      // resource: "/users/{user-id}/calendars/{calendar-id}/events/{event-id}"
      const match = resource.match(/users\/([^/]+)\/calendars\/([^/]+)\/events\/([^/]+)/);
      if (!match) continue;
      const [, , calendarId] = match;

      // Get all selected calendars for this calendarId
      const selectedCalendars = await SelectedCalendarRepository.findMany({
        where: { externalId: calendarId, integration: "office365_calendar" },
      });
      if (!selectedCalendars.length) {
        console.warn(`No selected calendars found for calendarId ${calendarId}`);
        continue;
      }

      // Group by credentialId and attach credential from DB
      const calendarsByCredential: { [credentialId: string]: any[] } = {};
      for (const cal of selectedCalendars) {
        const credId = String(cal.credentialId);
        const credential = credentialMap.get(credId);
        if (!credential) {
          console.warn(`No credential found in DB for credentialId ${credId} (calendarId ${calendarId})`);
          continue;
        }
        if (!calendarsByCredential[credId]) calendarsByCredential[credId] = [];
        calendarsByCredential[credId].push({ ...cal, credential });
      }

      let refreshedAny = false;
      for (const credId in calendarsByCredential) {
        const calendars = calendarsByCredential[credId];
        const { credential } = calendars[0];
        if (!credential) continue;
        const calendarService = new Office365CalendarService(credential);
        await calendarService.fetchAvailabilityAndSetCache(calendars);
        console.log(`Cache refreshed for calendarId ${calendarId} and credentialId ${credId}`);
        refreshedAny = true;
      }
      if (!refreshedAny) {
        console.warn(`No valid credentials found to refresh cache for calendarId ${calendarId}`);
      }
    }
    res.status(202).end();
    return;
  }

  res.status(405).end();
}
