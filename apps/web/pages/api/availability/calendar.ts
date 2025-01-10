import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { HttpError } from "@calcom/lib/http-error";
import notEmpty from "@calcom/lib/notEmpty";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { UserRepository } from "@calcom/lib/server/repository/user";

const selectedCalendarSelectSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.coerce.number(),
  eventTypeId: z.coerce.number().nullish(),
});

/** Shared authentication middleware for GET, DELETE and POST requests */
async function authMiddleware(req: CustomNextApiRequest) {
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }

  const userWithCredentials = await UserRepository.findUserWithCredentials({ id: session.user.id });

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
  const user = req.userWithCredentials;
  const { integration, externalId, credentialId, eventTypeId } = selectedCalendarSelectSchema.parse(req.body);
  await SelectedCalendarRepository.upsert({
    userId: user.id,
    integration,
    externalId,
    credentialId,
    eventTypeId: eventTypeId ?? null,
  });

  return { message: "Calendar Selection Saved" };
}

async function deleteHandler(req: CustomNextApiRequest) {
  if (!req.userWithCredentials) throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  const user = req.userWithCredentials;
  const { integration, externalId, credentialId, eventTypeId } = selectedCalendarSelectSchema.parse(
    req.query
  );
  const calendarCacheRepository = await CalendarCache.initFromCredentialId(credentialId);
  await calendarCacheRepository.unwatchCalendar({
    calendarId: externalId,
    eventTypeIds: [eventTypeId ?? null],
  });
  await SelectedCalendarRepository.delete({
    where: {
      userId: user.id,
      externalId,
      integration,
      eventTypeId: eventTypeId ?? null,
    },
  });

  return { message: "Calendar Selection Saved" };
}

// TODO: It doesn't seem to be used from within the app. It is possible that someone outside Cal.com is using this GET endpoint
async function getHandler(req: CustomNextApiRequest) {
  if (!req.userWithCredentials) throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  const user = req.userWithCredentials;
  const selectedCalendarIds = await SelectedCalendarRepository.findMany({
    where: { userId: user.id },
    select: { externalId: true },
  });
  // get user's credentials + their connected integrations
  const calendarCredentials = getCalendarCredentials(user.credentials);
  // get all the connected integrations' calendars (from third party)
  const { connectedCalendars } = await getConnectedCalendars(
    calendarCredentials,
    user.userLevelSelectedCalendars
  );
  const calendars = connectedCalendars.flatMap((c) => c.calendars).filter(notEmpty);
  const selectableCalendars = calendars.map((cal) => {
    return { selected: selectedCalendarIds.findIndex((s) => s.externalId === cal.externalId) > -1, ...cal };
  });
  return selectableCalendars;
}

export default defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
  await authMiddleware(req);
  return defaultHandler({
    GET: Promise.resolve({ default: defaultResponder(getHandler) }),
    POST: Promise.resolve({ default: defaultResponder(postHandler) }),
    DELETE: Promise.resolve({ default: defaultResponder(deleteHandler) }),
  })(req, res);
});
