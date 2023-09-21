import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import notEmpty from "@calcom/lib/notEmpty";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const selectedCalendarSelectSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.number().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const userWithCredentials = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
      timeZone: true,
      id: true,
      selectedCalendars: true,
    },
  });
  if (!userWithCredentials) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  const { credentials, ...user } = userWithCredentials;

  if (req.method === "POST") {
    const { integration, externalId, credentialId } = selectedCalendarSelectSchema.parse(req.body);
    await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId: user.id,
          integration,
          externalId,
        },
      },
      create: {
        userId: user.id,
        integration,
        externalId,
        credentialId,
      },
      // already exists
      update: {},
    });
    res.status(200).json({ message: "Calendar Selection Saved" });
  }

  if (req.method === "DELETE") {
    const { integration, externalId } = selectedCalendarSelectSchema.parse(req.query);
    await prisma.selectedCalendar.delete({
      where: {
        userId_integration_externalId: {
          userId: user.id,
          externalId,
          integration,
        },
      },
    });

    res.status(200).json({ message: "Calendar Selection Saved" });
  }

  if (req.method === "GET") {
    const selectedCalendarIds = await prisma.selectedCalendar.findMany({
      where: {
        userId: user.id,
      },
      select: {
        externalId: true,
      },
    });

    // get user's credentials + their connected integrations
    const calendarCredentials = getCalendarCredentials(credentials);
    // get all the connected integrations' calendars (from third party)
    const { connectedCalendars } = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);
    const calendars = connectedCalendars.flatMap((c) => c.calendars).filter(notEmpty);
    const selectableCalendars = calendars.map((cal) => {
      return { selected: selectedCalendarIds.findIndex((s) => s.externalId === cal.externalId) > -1, ...cal };
    });
    res.status(200).json(selectableCalendars);
  }
}
