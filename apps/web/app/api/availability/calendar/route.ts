import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import { HttpError } from "@calcom/lib/http-error";
import notEmpty from "@calcom/lib/notEmpty";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { UserRepository } from "@calcom/lib/server/repository/user";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const selectedCalendarSelectSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.coerce.number(),
  eventTypeId: z.coerce.number().nullish(),
});

async function authMiddleware() {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });

  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }

  const userWithCredentials = await UserRepository.findUserWithCredentials({ id: session.user.id });

  if (!userWithCredentials) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }

  return userWithCredentials;
}

// TODO: It doesn't seem to be used from within the app. It is possible that someone outside Cal.com is using this GET endpoint
async function getHandler() {
  const user = await authMiddleware();

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

  return NextResponse.json(selectableCalendars);
}

async function postHandler(req: NextRequest) {
  const user = await authMiddleware();
  const body = await req.json();
  const { integration, externalId, credentialId, eventTypeId } = selectedCalendarSelectSchema.parse(body);

  await SelectedCalendarRepository.upsert({
    userId: user.id,
    integration,
    externalId,
    credentialId,
    eventTypeId: eventTypeId ?? null,
  });

  return NextResponse.json({ message: "Calendar Selection Saved" });
}

async function deleteHandler(req: NextRequest) {
  const user = await authMiddleware();
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const { integration, externalId, credentialId, eventTypeId } =
    selectedCalendarSelectSchema.parse(searchParams);

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

  return NextResponse.json({ message: "Calendar Selection Saved" });
}

export { deleteHandler as DELETE, postHandler as POST, getHandler as GET };
