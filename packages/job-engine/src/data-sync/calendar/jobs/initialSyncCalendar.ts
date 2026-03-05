import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";

import { prisma } from "../../../prisma";
import { getAdapter } from "../providers/registry";
import {
  AuthExpiredError,
  CalendarProvider,
  ProviderPermanentError,
  ProviderTransientError,
  RateLimitedError,
  type CredentialLike,
  type NormalizedCalendarEventDTO,
  type ProviderSubscriptionDTO,
} from "../providers/types";
import { batchUpsertExternalCalendarEvents } from "./utils/batchUpsertExternalCalendarEvents";
import { getProviderAccountIdForLock, withCalendarSyncLock } from "./utils/calendarSyncLock";
import { MAX_OCCURRENCES_CAP, getRollingWindow } from "./utils/rollingWindow";
import { buildProviderWebhookUrl } from "./utils/webhookUrl";

type CalendarSyncStatus = "IDLE" | "SYNCING" | "ERROR";

interface ExternalCalendarWithCredentialRow {
  id: number;
  provider: string;
  providerCalendarId: string;
  syncEnabled: boolean;
  credentialId: number;
  credentialType: string;
  credentialKey: unknown;
  credentialUserId: number | null;
}

const log = logger.getSubLogger({ prefix: ["[job-engine/calendar/initial-sync]"] });

const ensureCalendarProvider = (value: string): CalendarProvider => {
  if (value === CalendarProvider.GOOGLE || value === CalendarProvider.OUTLOOK) {
    return value;
  }
  throw new ProviderPermanentError({
    provider: CalendarProvider.GOOGLE,
    message: `Unsupported calendar provider: ${value}`,
  });
};

const sanitizeErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/(access_token|refresh_token|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]")
    .slice(0, 500);
};

const getCalendarWithCredential = async (
  calendarId: number
): Promise<ExternalCalendarWithCredentialRow | null> => {
  const rows = await prisma.$queryRaw<ExternalCalendarWithCredentialRow[]>(
    Prisma.sql`
      SELECT
        ec."id",
        ec."provider",
        ec."providerCalendarId",
        ec."syncEnabled",
        ec."credentialId",
        c."type" AS "credentialType",
        c."key" AS "credentialKey",
        c."userId" AS "credentialUserId"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE ec."id" = ${calendarId}
      LIMIT 1
    `
  );

  return rows[0] ?? null;
};

const setCalendarSyncStatus = async (
  calendarId: number,
  status: CalendarSyncStatus,
  fields?: { lastErrorAt?: Date | null; lastErrorMessage?: string | null; lastSyncAt?: Date | null }
): Promise<void> => {
  const lastErrorAt = fields?.lastErrorAt ?? null;
  const lastErrorMessage = fields?.lastErrorMessage ?? null;
  const lastSyncAt = fields?.lastSyncAt ?? null;

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncStatus" = CAST(${status} AS "CalendarSyncStatus"),
        "lastErrorAt" = ${lastErrorAt},
        "lastErrorMessage" = ${lastErrorMessage},
        "lastSyncAt" = COALESCE(${lastSyncAt}, "lastSyncAt"),
        "updatedAt" = NOW()
      WHERE "id" = ${calendarId}
    `
  );
};

const isInsideWindow = (value: string, windowStart: Date, windowEnd: Date): boolean => {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return false;
  }
  return ms >= windowStart.getTime() && ms <= windowEnd.getTime();
};

const dedupeAndBoundEvents = (
  events: NormalizedCalendarEventDTO[],
  windowStart: Date,
  windowEnd: Date,
  maxOccurrencesCap: number
): NormalizedCalendarEventDTO[] => {
  const deduped = new Map<string, NormalizedCalendarEventDTO>();

  for (const event of events) {
    if (event.changeType !== "upsert") {
      continue;
    }
    if (!isInsideWindow(event.startTime, windowStart, windowEnd)) {
      continue;
    }
    if (!event.externalEventId) {
      continue;
    }
    deduped.set(event.externalEventId, event);
  }

  return [...deduped.values()].slice(0, maxOccurrencesCap);
};

const insertCursor = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  cursor: { type: string; value: string; expiresAt?: string | null }
): Promise<void> => {
  const expiresAt =
    cursor.expiresAt && !Number.isNaN(Date.parse(cursor.expiresAt)) ? new Date(cursor.expiresAt) : null;

  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO "ExternalCalendarSyncCursor" (
        "calendarId",
        "cursor",
        "cursorType",
        "expiresAt",
        "lastDeltaSyncAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${calendarId},
        ${cursor.value},
        CAST(${cursor.type} AS "CalendarCursorType"),
        ${expiresAt},
        NULL,
        NOW(),
        NOW()
      )
    `
  );
};

const insertSubscription = async (
  tx: Prisma.TransactionClient,
  calendarId: number,
  provider: CalendarProvider,
  subscription: ProviderSubscriptionDTO,
  webhookUrl: string
): Promise<void> => {
  const expirationDateTime =
    subscription.expirationDateTime && !Number.isNaN(Date.parse(subscription.expirationDateTime))
      ? new Date(subscription.expirationDateTime)
      : null;

  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO "ExternalCalendarSubscription" (
        "calendarId",
        "provider",
        "subscriptionId",
        "resourceId",
        "webhookUrl",
        "clientState",
        "expirationDateTime",
        "isActive",
        "failureCount",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${calendarId},
        CAST(${provider} AS "CalendarProvider"),
        ${subscription.subscriptionId},
        ${subscription.resourceId ?? null},
        ${webhookUrl},
        ${subscription.clientState ?? null},
        ${expirationDateTime},
        true,
        0,
        NOW(),
        NOW()
      )
    `
  );
};

const clearCalendarSyncState = async (tx: Prisma.TransactionClient, calendarId: number): Promise<void> => {
  await tx.$executeRaw(Prisma.sql`DELETE FROM "ExternalCalendarEvent" WHERE "calendarId" = ${calendarId}`);
  await tx.$executeRaw(
    Prisma.sql`DELETE FROM "ExternalCalendarSyncCursor" WHERE "calendarId" = ${calendarId}`
  );
  await tx.$executeRaw(
    Prisma.sql`DELETE FROM "ExternalCalendarSubscription" WHERE "calendarId" = ${calendarId}`
  );
};

const markSyncFailure = async (calendarId: number, error: unknown): Promise<void> => {
  const message = sanitizeErrorMessage(error);
  await setCalendarSyncStatus(calendarId, "ERROR", {
    lastErrorAt: new Date(),
    lastErrorMessage: message,
  });
};

export const runInitialCalendarSync = async (calendarId: number): Promise<void> => {
  const startedAt = Date.now();
  let fetchedEventCount = 0;
  let upsertedEventCount = 0;

  const calendarRow = await getCalendarWithCredential(calendarId);
  if (!calendarRow) {
    return;
  }
  if (!calendarRow.syncEnabled) {
    return;
  }

  const provider = ensureCalendarProvider(calendarRow.provider);
  const adapter = getAdapter(provider);

  await withCalendarSyncLock(
    {
      provider,
      providerAccountId: getProviderAccountIdForLock({
        credentialKey: calendarRow.credentialKey,
        credentialId: calendarRow.credentialId,
      }),
      calendarId,
    },
    async () => {
      const lockedCalendarRow = await getCalendarWithCredential(calendarId);
      if (!lockedCalendarRow || !lockedCalendarRow.syncEnabled) {
        return;
      }
      if (lockedCalendarRow.credentialUserId === null) {
        throw new ProviderPermanentError({
          provider,
          message: `Credential ${lockedCalendarRow.credentialId} is missing userId.`,
        });
      }

      const credential: CredentialLike = {
        id: lockedCalendarRow.credentialId,
        type: lockedCalendarRow.credentialType,
        key: lockedCalendarRow.credentialKey,
      };

      const { windowStart, windowEnd } = getRollingWindow();
      const webhookUrl = buildProviderWebhookUrl(provider);

      await setCalendarSyncStatus(calendarId, "SYNCING", {
        lastErrorAt: null,
        lastErrorMessage: null,
      });

      log.info("initial_sync_started", {
        event: "initial_sync_started",
        calendarId,
        provider,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        maxOccurrencesCap: MAX_OCCURRENCES_CAP,
      });

      let createdSubscription: ProviderSubscriptionDTO | null = null;

      try {
        const result = await adapter.fetchInitialWindow({
          credential,
          providerCalendarId: lockedCalendarRow.providerCalendarId,
          windowStart,
          windowEnd,
          maxOccurrencesCap: MAX_OCCURRENCES_CAP,
        });
        fetchedEventCount = result.events.length;

        if (!result.nextCursor?.value) {
          throw new ProviderPermanentError({
            provider,
            message: "Initial sync did not return a valid cursor.",
          });
        }

        const normalizedEvents = dedupeAndBoundEvents(
          result.events,
          windowStart,
          windowEnd,
          MAX_OCCURRENCES_CAP
        );
        createdSubscription = await adapter.createSubscription({
          credential,
          providerCalendarId: lockedCalendarRow.providerCalendarId,
          webhookUrl,
        });

        if (!createdSubscription.subscriptionId) {
          throw new ProviderPermanentError({
            provider,
            message: "Provider returned invalid subscription metadata.",
          });
        }

        await prisma.$transaction(async (tx) => {
          await clearCalendarSyncState(tx, calendarId);

          upsertedEventCount = await batchUpsertExternalCalendarEvents({
            tx,
            calendarId,
            userId: lockedCalendarRow.credentialUserId as number,
            provider,
            events: normalizedEvents,
          });

          await insertCursor(tx, calendarId, result.nextCursor);
          await insertSubscription(
            tx,
            calendarId,
            provider,
            createdSubscription as ProviderSubscriptionDTO,
            webhookUrl
          );

          await tx.$executeRaw(
            Prisma.sql`
            UPDATE "ExternalCalendar"
            SET
              "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
              "lastSyncAt" = NOW(),
              "lastErrorAt" = NULL,
              "lastErrorMessage" = NULL,
              "updatedAt" = NOW()
            WHERE "id" = ${calendarId}
          `
          );
        });

        const durationMs = Date.now() - startedAt;
        log.info("initial_sync_completed", {
          event: "initial_sync_completed",
          calendarId,
          provider,
          event_count: upsertedEventCount,
          fetched_event_count: fetchedEventCount,
          duration_ms: durationMs,
        });
      } catch (error) {
        const durationMs = Date.now() - startedAt;

        if (createdSubscription) {
          try {
            await adapter.deleteSubscription({
              credential,
              subscription: createdSubscription,
            });
          } catch {
            // Best effort cleanup only.
          }
        }

        await markSyncFailure(calendarId, error);
        log.error("initial_sync_failed", {
          event: "initial_sync_failed",
          calendarId,
          provider,
          event_count: upsertedEventCount,
          fetched_event_count: fetchedEventCount,
          duration_ms: durationMs,
          error: sanitizeErrorMessage(error),
        });

        if (error instanceof AuthExpiredError || error instanceof ProviderPermanentError) {
          return;
        }

        if (error instanceof RateLimitedError || error instanceof ProviderTransientError) {
          throw error;
        }

        throw error;
      }
    }
  );
};
