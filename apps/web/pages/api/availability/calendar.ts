import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { handleWatchCalendar } from "@calcom/features/calendar-cache/lib/handleWatchCalendar";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import notEmpty from "@calcom/lib/notEmpty";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const selectedCalendarSelectSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.number().optional(),
});

/** Shared authentication middleware for GET, DELETE and POST requests */
async function authMiddleware(req: CustomNextApiRequest) {
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
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
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }
  req.userWithCredentials = userWithCredentials;
  return userWithCredentials;
}

type CustomNextApiRequest = NextApiRequest & {
  userWithCredentials?: Awaited<ReturnType<typeof authMiddleware>>;
};

async function postHandler(req: CustomNextApiRequest) {
  if (!req.userWithCredentials) throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  const { credentials: _, ...user } = req.userWithCredentials;
  const { integration, externalId, credentialId } = selectedCalendarSelectSchema.parse(req.body);
  const response = await handleWatchCalendarFromReq(req);

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
      googleChannelId: response?.id,
      googleChannelKind: response?.kind,
      googleChannelResourceId: response?.resourceId,
      googleChannelResourceUri: response?.resourceUri,
      googleChannelExpiration: response?.expiration,
    },
    // already exists
    update: {
      googleChannelId: response?.id,
      googleChannelKind: response?.kind,
      googleChannelResourceId: response?.resourceId,
      googleChannelResourceUri: response?.resourceUri,
      googleChannelExpiration: response?.expiration,
    },
  });

  return { message: "Calendar Selection Saved" };
}

async function deleteHandler(req: CustomNextApiRequest) {
  if (!req.userWithCredentials) throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  const { credentials: _, ...user } = req.userWithCredentials;
  const { integration, externalId } = selectedCalendarSelectSchema.parse(req.query);
  await handleUnwatchCalendar(req);
  await prisma.selectedCalendar.delete({
    where: {
      userId_integration_externalId: {
        userId: user.id,
        externalId,
        integration,
      },
    },
  });

  return { message: "Calendar Selection Saved" };
}

async function getHandler(req: CustomNextApiRequest) {
  if (!req.userWithCredentials) throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  const { credentials, ...user } = req.userWithCredentials;
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
  return selectableCalendars;
}

async function getCalendarForRequest(req: NextApiRequest, query: any) {
  const flags = await getFeatureFlagMap(prisma);
  if (!flags["calendar-cache"]) {
    logger.info(
      '[handleWatchCalendar] Skipping watching calendar due to "calendar-cache" flag being disabled'
    );
    return;
  }
  const { integration, externalId, credentialId } = selectedCalendarSelectSchema.parse(query);
  if (integration !== "google_calendar") {
    logger.info('[handleWatchCalendar] Skipping watching calendar due to integration not being "google"');
    return;
  }
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId },
    select: credentialForCalendarServiceSelect,
  });
  const calendar = await getCalendar(credential);
  return { calendar, externalId };
}

export async function handleWatchCalendarFromReq(req: NextApiRequest) {
  const result = await getCalendarForRequest(req, req.body);
  if (!result) return;
  const { calendar, externalId } = result;
  return handleWatchCalendar(calendar, externalId);
}

async function handleUnwatchCalendar(req: NextApiRequest) {
  const result = await getCalendarForRequest(req, req.query);
  if (!result) return;
  const { calendar, externalId } = result;
  if (typeof calendar?.unwatchCalendar !== "function") {
    logger.info(
      '[handleUnwatchCalendar] Skipping watching calendar due to calendar not having "unwatchCalendar" method'
    );
    return;
  }
  await calendar.unwatchCalendar({ calendarId: externalId });
}

export default defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
  await authMiddleware(req);
  return defaultHandler({
    GET: Promise.resolve({ default: defaultResponder(getHandler) }),
    POST: Promise.resolve({ default: defaultResponder(postHandler) }),
    DELETE: Promise.resolve({ default: defaultResponder(deleteHandler) }),
  })(req, res);
});
