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
  type ProviderSubscriptionDTO,
} from "../providers/types";
import { getProviderAccountIdForLock, withCalendarSyncLock } from "./utils/calendarSyncLock";

interface CalendarDisableRow {
  id: number;
  provider: string;
  syncEnabled: boolean;
  credentialId: number;
  credentialType: string;
  credentialKey: unknown;
  activeSubscriptionId: string | null;
  activeSubscriptionProvider: string | null;
  activeSubscriptionResourceId: string | null;
  activeSubscriptionClientState: string | null;
  activeSubscriptionExpirationDateTime: Date | null;
}

export interface DisableCalendarSyncOptions {
  reason?: "user" | "admin" | "system";
  syncDisabledReason?: "USER_DISCONNECTED" | "USER_TOGGLED_OFF" | "SUBSCRIPTION_RENEWAL_FAILED";
  hardDeleteEvents?: boolean;
  purgeTombstones?: boolean;
}

export interface DisableCalendarSyncResult {
  calendarId: number;
  wasEnabled: boolean;
  subscriptionDeleted: boolean;
  eventsDeletedCount: number;
  cursorCleared: boolean;
  subscriptionCleared: boolean;
  tombstonesPurgedCount?: number;
}

type CalendarSyncStatus = "IDLE" | "SYNCING" | "ERROR";

const log = logger.getSubLogger({ prefix: ["[job-engine/calendar/disable-sync]"] });

const sanitizeErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/(access_token|refresh_token|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]")
    .slice(0, 500);
};

const ensureCalendarProvider = (value: string): CalendarProvider => {
  if (value === CalendarProvider.GOOGLE || value === CalendarProvider.OUTLOOK) {
    return value;
  }

  throw new ProviderPermanentError({
    provider: CalendarProvider.GOOGLE,
    message: `Unsupported calendar provider: ${value}`,
  });
};

const getCalendarForDisable = async (calendarId: number): Promise<CalendarDisableRow | null> => {
  const rows = await prisma.$queryRaw<CalendarDisableRow[]>(
    Prisma.sql`
      SELECT
        ec."id",
        ec."provider",
        ec."syncEnabled",
        ec."credentialId",
        c."type" AS "credentialType",
        c."key" AS "credentialKey",
        s."subscriptionId" AS "activeSubscriptionId",
        s."provider"::text AS "activeSubscriptionProvider",
        s."resourceId" AS "activeSubscriptionResourceId",
        s."clientState" AS "activeSubscriptionClientState",
        s."expirationDateTime" AS "activeSubscriptionExpirationDateTime"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      LEFT JOIN LATERAL (
        SELECT
          subs."subscriptionId",
          subs."provider",
          subs."resourceId",
          subs."clientState",
          subs."expirationDateTime"
        FROM "ExternalCalendarSubscription" subs
        WHERE subs."calendarId" = ec."id"
          AND subs."isActive" = true
        ORDER BY subs."updatedAt" DESC, subs."id" DESC
        LIMIT 1
      ) s ON true
      WHERE ec."id" = ${calendarId}
      LIMIT 1
    `
  );

  return rows[0] ?? null;
};

const setCalendarDisabledEarly = async (calendarId: number): Promise<void> => {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncEnabled" = false,
        "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
        "lastErrorAt" = NULL,
        "lastErrorMessage" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${calendarId}
    `
  );
};

const getDisabledBy = (reason: DisableCalendarSyncOptions["reason"]): "USER" | "SYSTEM" => {
  return reason === "system" ? "SYSTEM" : "USER";
};

const isSubscriptionNotFoundError = (error: unknown): boolean => {
  const message = sanitizeErrorMessage(error).toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("resource not found") ||
    message.includes("gone") ||
    message.includes("unknown channel") ||
    message.includes("invalid subscription")
  );
};

const deleteProviderSubscriptionBestEffort = async (params: {
  calendarId: number;
  provider: CalendarProvider;
  credential: CredentialLike;
  activeSubscriptionId: string | null;
  activeSubscriptionResourceId: string | null;
  activeSubscriptionClientState: string | null;
  activeSubscriptionExpirationDateTime: Date | null;
}): Promise<boolean> => {
  if (!params.activeSubscriptionId) {
    return true;
  }

  const adapter = getAdapter(params.provider);
  const subscription: ProviderSubscriptionDTO = {
    subscriptionId: params.activeSubscriptionId,
    resourceId: params.activeSubscriptionResourceId,
    clientState: params.activeSubscriptionClientState,
    expirationDateTime: params.activeSubscriptionExpirationDateTime?.toISOString() ?? null,
  };

  log.info("disable_sync_subscription_delete_attempt", {
    event: "disable_sync_subscription_delete_attempt",
    calendarId: params.calendarId,
    provider: params.provider,
    subscriptionId: params.activeSubscriptionId,
  });

  try {
    await adapter.deleteSubscription({
      credential: params.credential,
      subscription,
    });

    log.info("disable_sync_subscription_delete_success", {
      event: "disable_sync_subscription_delete_success",
      calendarId: params.calendarId,
    });
    return true;
  } catch (error) {
    if (isSubscriptionNotFoundError(error)) {
      log.info("disable_sync_subscription_delete_success", {
        event: "disable_sync_subscription_delete_success",
        calendarId: params.calendarId,
      });
      return true;
    }

    if (
      error instanceof AuthExpiredError ||
      error instanceof RateLimitedError ||
      error instanceof ProviderTransientError ||
      error instanceof ProviderPermanentError
    ) {
      log.error("disable_sync_subscription_delete_failed", {
        event: "disable_sync_subscription_delete_failed",
        calendarId: params.calendarId,
        errorType: error.name,
        error: sanitizeErrorMessage(error),
      });
      return false;
    }

    log.error("disable_sync_subscription_delete_failed", {
      event: "disable_sync_subscription_delete_failed",
      calendarId: params.calendarId,
      errorType: error instanceof Error ? error.name : "UnknownError",
      error: sanitizeErrorMessage(error),
    });
    return false;
  }
};

const runLocalCleanup = async (params: {
  calendarId: number;
  hardDeleteEvents: boolean;
  purgeTombstones: boolean;
  syncDisabledReason: "USER_DISCONNECTED" | "USER_TOGGLED_OFF" | "SUBSCRIPTION_RENEWAL_FAILED";
  syncDisabledBy: "USER" | "SYSTEM";
}): Promise<{
  eventsDeletedCount: number;
  cursorCleared: boolean;
  subscriptionCleared: boolean;
  tombstonesPurgedCount?: number;
}> => {
  return await prisma.$transaction(async (tx) => {
    const eventsDeleted = params.hardDeleteEvents
      ? Number(
          await tx.$executeRaw(
            Prisma.sql`DELETE FROM "ExternalCalendarEvent" WHERE "calendarId" = ${params.calendarId}`
          )
        )
      : 0;

    const cursorDeleted = Number(
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM "ExternalCalendarSyncCursor" WHERE "calendarId" = ${params.calendarId}`
      )
    );

    const subscriptionsDeleted = Number(
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM "ExternalCalendarSubscription" WHERE "calendarId" = ${params.calendarId}`
      )
    );

    let tombstonesPurgedCount: number | undefined = undefined;
    if (params.purgeTombstones) {
      tombstonesPurgedCount = Number(
        await tx.$executeRaw(
          Prisma.sql`DELETE FROM "ExternalCalendarEventTombstone" WHERE "calendarId" = ${params.calendarId}`
        )
      );
    }

    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "ExternalCalendar"
        SET
          "syncEnabled" = false,
          "syncStatus" = CAST(${"IDLE" as CalendarSyncStatus} AS "CalendarSyncStatus"),
          "syncDisabledReason" = CAST(${params.syncDisabledReason} AS "CalendarSyncDisabledReason"),
          "syncDisabledBy" = CAST(${params.syncDisabledBy} AS "CalendarSyncDisabledBy"),
          "syncDisabledAt" = NOW(),
          "lastErrorAt" = NULL,
          "lastErrorMessage" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = ${params.calendarId}
      `
    );

    return {
      eventsDeletedCount: eventsDeleted,
      cursorCleared: cursorDeleted > 0,
      subscriptionCleared: subscriptionsDeleted > 0,
      tombstonesPurgedCount,
    };
  });
};

export const disableCalendarSync = async (
  calendarId: number,
  opts: DisableCalendarSyncOptions = {}
): Promise<DisableCalendarSyncResult> => {
  const reason = opts.reason ?? "user";
  const syncDisabledReason = opts.syncDisabledReason ?? "USER_TOGGLED_OFF";
  const syncDisabledBy = getDisabledBy(reason);
  const hardDeleteEvents = opts.hardDeleteEvents ?? true;
  const purgeTombstones = opts.purgeTombstones ?? true;

  const existing = await getCalendarForDisable(calendarId);
  if (!existing) {
    return {
      calendarId,
      wasEnabled: false,
      subscriptionDeleted: true,
      eventsDeletedCount: 0,
      cursorCleared: false,
      subscriptionCleared: false,
      tombstonesPurgedCount: purgeTombstones ? 0 : undefined,
    };
  }

  return await withCalendarSyncLock(
    {
      provider: existing.provider,
      providerAccountId: getProviderAccountIdForLock({
        credentialKey: existing.credentialKey,
        credentialId: existing.credentialId,
      }),
      calendarId,
    },
    async () => {
      const calendar = await getCalendarForDisable(calendarId);
      if (!calendar) {
        return {
          calendarId,
          wasEnabled: false,
          subscriptionDeleted: true,
          eventsDeletedCount: 0,
          cursorCleared: false,
          subscriptionCleared: false,
          tombstonesPurgedCount: purgeTombstones ? 0 : undefined,
        };
      }

      const provider = ensureCalendarProvider(calendar.provider);

      log.info("disable_sync_started", {
        event: "disable_sync_started",
        calendarId,
        reason,
        wasEnabled: calendar.syncEnabled,
      });

      await setCalendarDisabledEarly(calendarId);

      const credential: CredentialLike = {
        id: calendar.credentialId,
        type: calendar.credentialType,
        key: calendar.credentialKey,
      };

      const subscriptionDeleted = await deleteProviderSubscriptionBestEffort({
        calendarId,
        provider,
        credential,
        activeSubscriptionId: calendar.activeSubscriptionId,
        activeSubscriptionResourceId: calendar.activeSubscriptionResourceId,
        activeSubscriptionClientState: calendar.activeSubscriptionClientState,
        activeSubscriptionExpirationDateTime: calendar.activeSubscriptionExpirationDateTime,
      });

      const cleanupResult = await runLocalCleanup({
        calendarId,
        hardDeleteEvents,
        purgeTombstones,
        syncDisabledReason,
        syncDisabledBy,
      });

      log.info("disable_sync_db_cleanup_completed", {
        event: "disable_sync_db_cleanup_completed",
        calendarId,
        eventsDeletedCount: cleanupResult.eventsDeletedCount,
        tombstonesPurgedCount: cleanupResult.tombstonesPurgedCount ?? 0,
      });

      log.info("disable_sync_completed", {
        event: "disable_sync_completed",
        calendarId,
        reason,
      });

      return {
        calendarId,
        wasEnabled: calendar.syncEnabled,
        subscriptionDeleted,
        eventsDeletedCount: cleanupResult.eventsDeletedCount,
        cursorCleared: cleanupResult.cursorCleared,
        subscriptionCleared: cleanupResult.subscriptionCleared,
        tombstonesPurgedCount: cleanupResult.tombstonesPurgedCount,
      };
    }
  );
};
