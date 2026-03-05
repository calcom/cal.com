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
  providerAccountId: string | null;
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
        ec."syncEnabled",
        COALESCE(
          c."key"->>'providerAccountId',
          c."key"->>'provider_account_id',
          c."key"->>'accountId',
          c."key"->>'account_id',
          c."key"->>'tenantId',
          c."key"->>'tenant_id',
          c."key"->>'sub',
          c."key"->>'oid',
          c."key"->>'email'
        ) AS "providerAccountId"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE ec."credentialId" IN (${Prisma.join(params.credentialIds)})
        AND ec."providerCalendarId" IN (${Prisma.join(params.providerCalendarIds)})
    `
  );

  return new Map(rows.map((row) => [`${row.credentialId}:${row.providerCalendarId}`, row]));
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
          syncProviderAccountId: syncState?.providerAccountId ?? null,
        };
      }) ?? [],
  }));

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
