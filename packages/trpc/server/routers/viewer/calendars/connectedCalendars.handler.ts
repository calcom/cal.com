import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/lib/getConnectedDestinationCalendars";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectedCalendarsInputSchema;
};

interface ExternalCalendarSyncStateRow {
  credentialId: number;
  providerCalendarId: string;
  provider: string;
  syncEnabled: boolean;
}

interface CalendarCandidateRow {
  credentialId: number;
  provider: "GOOGLE" | "OUTLOOK";
  providerCalendarId: string;
  calendarName: string | null;
  isPrimary: boolean;
}

const getProviderFromIntegrationType = (integrationType: string): "GOOGLE" | "OUTLOOK" | null => {
  const normalized = integrationType.toLowerCase();
  if (normalized.includes("google")) {
    return "GOOGLE";
  }
  if (
    normalized.includes("office365") ||
    normalized.includes("outlook") ||
    normalized.includes("microsoft")
  ) {
    return "OUTLOOK";
  }
  return null;
};

const buildCalendarSyncStateMap = async (params: {
  credentialIds: number[];
  providerCalendarIds: string[];
}): Promise<Map<string, ExternalCalendarSyncStateRow>> => {
  if (params.credentialIds.length === 0 || params.providerCalendarIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.$queryRaw<ExternalCalendarSyncStateRow[]>(
    Prisma.sql`
      SELECT
        ec."credentialId",
        ec."providerCalendarId",
        ec."provider"::text AS "provider",
        ec."syncEnabled"
      FROM "ExternalCalendar" ec
      WHERE ec."credentialId" IN (${Prisma.join(params.credentialIds)})
        AND ec."providerCalendarId" IN (${Prisma.join(params.providerCalendarIds)})
    `
  );

  return new Map(rows.map((row) => [`${row.credentialId}:${row.providerCalendarId}`, row]));
};

const reconcileExternalCalendars = async (candidates: CalendarCandidateRow[]): Promise<void> => {
  if (candidates.length === 0) {
    return;
  }

  for (const candidate of candidates) {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "ExternalCalendar" (
          "credentialId",
          "provider",
          "providerCalendarId",
          "calendarName",
          "isPrimary",
          "syncEnabled",
          "syncStatus",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${candidate.credentialId},
          CAST(${candidate.provider} AS "CalendarProvider"),
          ${candidate.providerCalendarId},
          ${candidate.calendarName},
          ${candidate.isPrimary},
          false,
          CAST(${"IDLE"} AS "CalendarSyncStatus"),
          NOW(),
          NOW()
        )
        ON CONFLICT ("credentialId", "providerCalendarId")
        DO UPDATE SET
          "provider" = CAST(${candidate.provider} AS "CalendarProvider"),
          "calendarName" = EXCLUDED."calendarName",
          "isPrimary" = EXCLUDED."isPrimary",
          "updatedAt" = NOW()
      `
    );
  }

  const byCredentialAndProvider = new Map<
    string,
    { credentialId: number; provider: "GOOGLE" | "OUTLOOK"; ids: string[] }
  >();
  for (const candidate of candidates) {
    const key = `${candidate.credentialId}:${candidate.provider}`;
    const current = byCredentialAndProvider.get(key);
    if (!current) {
      byCredentialAndProvider.set(key, {
        credentialId: candidate.credentialId,
        provider: candidate.provider,
        ids: [candidate.providerCalendarId],
      });
      continue;
    }
    current.ids.push(candidate.providerCalendarId);
  }

  for (const group of Array.from(byCredentialAndProvider.values())) {
    await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM "ExternalCalendar"
        WHERE "credentialId" = ${group.credentialId}
          AND "provider" = CAST(${group.provider} AS "CalendarProvider")
          AND "syncEnabled" = false
          AND "providerCalendarId" NOT IN (${Prisma.join(group.ids)})
      `
    );
  }
};

export const connectedCalendarsHandler = async ({ ctx, input }: ConnectedCalendarsOptions) => {
  const { user } = ctx;
  const onboarding = input?.onboarding || false;

  const { connectedCalendars, destinationCalendar } =
    await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
      user,
      onboarding,
      eventTypeId: input?.eventTypeId ?? null,
      prisma,
    });

  const credentialIds = connectedCalendars.map((cal) => cal.credentialId);
  const calendarCandidates: CalendarCandidateRow[] = connectedCalendars.flatMap((connectedCalendar) => {
    const provider = getProviderFromIntegrationType(connectedCalendar.integration.type);
    if (!provider) {
      return [];
    }
    return (connectedCalendar.calendars ?? [])
      .filter((cal) => typeof cal.externalId === "string" && cal.externalId.length > 0)
      .map((cal) => ({
        credentialId: connectedCalendar.credentialId,
        provider,
        providerCalendarId: cal.externalId,
        calendarName: cal.name ?? null,
        isPrimary: cal.externalId === "primary",
      }));
  });

  await reconcileExternalCalendars(calendarCandidates);

  const providerCalendarIds = connectedCalendars
    .flatMap((cal) => cal.calendars?.map((c) => c.externalId) ?? [])
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const cacheRepository = new CalendarCacheRepository();
  const [cacheStatuses, syncStateMap] = await Promise.all([
    cacheRepository.getCacheStatusByCredentialIds(credentialIds),
    buildCalendarSyncStateMap({
      credentialIds,
      providerCalendarIds,
    }),
  ]);

  const cacheStatusMap = new Map(cacheStatuses.map((cache) => [cache.credentialId, cache.updatedAt]));

  const enrichedConnectedCalendars = connectedCalendars.map((calendar) => ({
    ...calendar,
    cacheUpdatedAt: cacheStatusMap.get(calendar.credentialId) || null,
    calendars:
      calendar.calendars?.map((cal) => {
        const syncState = syncStateMap.get(`${calendar.credentialId}:${cal.externalId}`);
        return {
          ...cal,
          syncEnabled: syncState?.syncEnabled ?? false,
          syncProvider: syncState?.provider ?? getProviderFromIntegrationType(calendar.integration.type),
        };
      }) ?? [],
  }));

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
