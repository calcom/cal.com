import { withLock } from "@calid/redis";
import { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";

import { prisma } from "../../../prisma";
import { getAdapter } from "../providers/registry";
import {
  AuthExpiredError,
  CalendarProvider,
  NotRenewableError,
  ProviderPermanentError,
  ProviderTransientError,
  RateLimitedError,
  type CredentialLike,
  type ProviderSubscriptionDTO,
} from "../providers/types";
import { getProviderAccountIdForLock } from "./utils/calendarSyncLock";
import { buildProviderWebhookUrl } from "./utils/webhookUrl";

interface RenewalCandidateRow {
  subscriptionRowId: number;
  calendarId: number;
  provider: string;
  providerCalendarId: string;
  subscriptionId: string;
  resourceId: string | null;
  webhookUrl: string | null;
  clientState: string | null;
  expirationDateTime: Date | null;
  failureCount: number;
  credentialId: number;
  credentialType: string;
  credentialKey: unknown;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_RENEW_WITHIN_HOURS = 24;
const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_LOCK_TTL_MS = 60_000;
const DEFAULT_LOCK_MAX_WAIT_MS = 1_000;

const log = logger.getSubLogger({ prefix: ["[job-engine/calendar/subscription-renewal]"] });

export interface SubscriptionRenewalStats {
  scanned: number;
  attempted: number;
  renewed: number;
  recreated: number;
  failed: number;
  skippedLocked: number;
  markedInactive: number;
  autoDisableTargets: {
    calendarId: number;
    provider: CalendarProvider;
    providerAccountId: string;
  }[];
}

export interface RunSubscriptionRenewalCronParams {
  batchSize?: number;
  renewWithinHours?: number;
  maxFailures?: number;
  lockTtlMs?: number;
}

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

const isRecreateFallbackError = (error: unknown): boolean => {
  if (error instanceof NotRenewableError) {
    return true;
  }

  if (!(error instanceof ProviderPermanentError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("renew") &&
    (message.includes("not supported") ||
      message.includes("not implemented") ||
      message.includes("recreate") ||
      message.includes("must create"))
  );
};

const getRenewalCandidates = async (params: {
  threshold: Date;
  batchSize: number;
  cursorId: number;
}): Promise<RenewalCandidateRow[]> => {
  return await prisma.$queryRaw<RenewalCandidateRow[]>(
    Prisma.sql`
      SELECT
        s."id" AS "subscriptionRowId",
        s."calendarId",
        s."provider",
        cals."providerCalendarId",
        s."subscriptionId",
        s."resourceId",
        s."webhookUrl",
        s."clientState",
        s."expirationDateTime",
        s."failureCount",
        cals."credentialId",
        cred."type" AS "credentialType",
        cred."key" AS "credentialKey"
      FROM "ExternalCalendarSubscription" s
      INNER JOIN "ExternalCalendar" cals ON cals."id" = s."calendarId"
      INNER JOIN "Credential" cred ON cred."id" = cals."credentialId"
      WHERE s."id" > ${params.cursorId}
        AND s."isActive" = true
        AND cals."syncEnabled" = true
        AND (s."expirationDateTime" IS NULL OR s."expirationDateTime" <= ${params.threshold})
      ORDER BY s."id" ASC
      LIMIT ${params.batchSize}
    `
  );
};

const updateSubscriptionSuccess = async (params: {
  subscriptionRowId: number;
  provider: CalendarProvider;
  subscription: ProviderSubscriptionDTO;
  webhookUrl: string;
}) => {
  const expirationDateTime =
    params.subscription.expirationDateTime &&
    !Number.isNaN(Date.parse(params.subscription.expirationDateTime))
      ? new Date(params.subscription.expirationDateTime)
      : null;

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendarSubscription"
      SET
        "provider" = CAST(${params.provider} AS "CalendarProvider"),
        "subscriptionId" = ${params.subscription.subscriptionId},
        "resourceId" = ${params.subscription.resourceId ?? null},
        "clientState" = ${params.subscription.clientState ?? null},
        "expirationDateTime" = ${expirationDateTime},
        "webhookUrl" = ${params.webhookUrl},
        "failureCount" = 0,
        "isActive" = true,
        "updatedAt" = NOW()
      WHERE "id" = ${params.subscriptionRowId}
    `
  );
};

const markRenewalFailure = async (params: {
  subscriptionRowId: number;
  calendarId: number;
  nextFailureCount: number;
  shouldDeactivate: boolean;
  errorMessage: string;
}): Promise<{ markedInactive: boolean }> => {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "ExternalCalendarSubscription"
        SET
          "failureCount" = ${params.nextFailureCount},
          "isActive" = CASE WHEN ${params.shouldDeactivate} THEN false ELSE "isActive" END,
          "updatedAt" = NOW()
        WHERE "id" = ${params.subscriptionRowId}
      `
    );

    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "ExternalCalendar"
        SET
          "syncEnabled" = CASE WHEN ${params.shouldDeactivate} THEN false ELSE "syncEnabled" END,
          "lastErrorAt" = NOW(),
          "lastErrorMessage" = ${params.errorMessage},
          "syncStatus" = CASE WHEN ${
            params.shouldDeactivate
          } THEN CAST(${"ERROR"} AS "CalendarSyncStatus") ELSE "syncStatus" END,
          "syncDisabledReason" = CASE
            WHEN ${params.shouldDeactivate}
            THEN CAST(${"SUBSCRIPTION_RENEWAL_FAILED"} AS "CalendarSyncDisabledReason")
            ELSE "syncDisabledReason"
          END,
          "syncDisabledBy" = CASE
            WHEN ${params.shouldDeactivate}
            THEN CAST(${"SYSTEM"} AS "CalendarSyncDisabledBy")
            ELSE "syncDisabledBy"
          END,
          "syncDisabledAt" = CASE
            WHEN ${params.shouldDeactivate}
            THEN NOW()
            ELSE "syncDisabledAt"
          END,
          "updatedAt" = NOW()
        WHERE "id" = ${params.calendarId}
      `
    );

    return { markedInactive: params.shouldDeactivate };
  });
};

const processCandidate = async (params: {
  candidate: RenewalCandidateRow;
  maxFailures: number;
  lockTtlMs: number;
  providerCooldownUntil: Map<CalendarProvider, number>;
}): Promise<{
  attempted: number;
  renewed: number;
  recreated: number;
  failed: number;
  skippedLocked: number;
  markedInactive: number;
  autoDisableTargets: {
    calendarId: number;
    provider: CalendarProvider;
    providerAccountId: string;
  }[];
}> => {
  const candidate = params.candidate;
  const provider = ensureCalendarProvider(candidate.provider);

  const cooldownUntil = params.providerCooldownUntil.get(provider) ?? 0;
  if (cooldownUntil > Date.now()) {
    return {
      attempted: 0,
      renewed: 0,
      recreated: 0,
      failed: 0,
      skippedLocked: 0,
      markedInactive: 0,
      autoDisableTargets: [],
    };
  }

  const lockKey = `subscription_renew:${candidate.calendarId}`;

  const maxRetries = Math.max(0, Math.floor(DEFAULT_LOCK_MAX_WAIT_MS / 75));

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await withLock(lockKey, params.lockTtlMs, async () => {
      const adapter = getAdapter(provider);
      const credential: CredentialLike = {
        id: candidate.credentialId,
        type: candidate.credentialType,
        key: candidate.credentialKey,
      };

      const subscription: ProviderSubscriptionDTO = {
        subscriptionId: candidate.subscriptionId,
        resourceId: candidate.resourceId,
        clientState: candidate.clientState,
        expirationDateTime: candidate.expirationDateTime?.toISOString() ?? null,
      };

      const webhookUrl =
        candidate.webhookUrl && candidate.webhookUrl.trim().length > 0
          ? candidate.webhookUrl
          : buildProviderWebhookUrl(provider);

      log.info("subscription_renewal_attempt", {
        event: "subscription_renewal_attempt",
        calendarId: candidate.calendarId,
        provider,
        subscriptionId: candidate.subscriptionId,
        expiresAt: candidate.expirationDateTime?.toISOString() ?? null,
      });

      try {
        const renewed = await adapter.renewSubscription({
          credential,
          providerCalendarId: candidate.providerCalendarId,
          subscription,
          webhookUrl,
        });

        await updateSubscriptionSuccess({
          subscriptionRowId: candidate.subscriptionRowId,
          provider,
          subscription: renewed,
          webhookUrl,
        });

        log.info("subscription_renewal_success", {
          event: "subscription_renewal_success",
          calendarId: candidate.calendarId,
          provider,
          subscriptionId: renewed.subscriptionId,
          newExpiresAt: renewed.expirationDateTime ?? null,
        });

        return {
          attempted: 1,
          renewed: 1,
          recreated: 0,
          failed: 0,
          skippedLocked: 0,
          markedInactive: 0,
          autoDisableTargets: [],
        };
      } catch (error) {
        if (isRecreateFallbackError(error)) {
          try {
            await adapter.deleteSubscription({
              credential,
              subscription,
            });
          } catch {
            // Best effort provider cleanup only.
          }

          const created = await adapter.createSubscription({
            credential,
            providerCalendarId: candidate.providerCalendarId,
            webhookUrl,
          });

          await updateSubscriptionSuccess({
            subscriptionRowId: candidate.subscriptionRowId,
            provider,
            subscription: created,
            webhookUrl,
          });

          log.info("subscription_recreate_success", {
            event: "subscription_recreate_success",
            calendarId: candidate.calendarId,
            provider,
            newSubscriptionId: created.subscriptionId,
            newExpiresAt: created.expirationDateTime ?? null,
          });

          return {
            attempted: 1,
            renewed: 0,
            recreated: 1,
            failed: 0,
            skippedLocked: 0,
            markedInactive: 0,
            autoDisableTargets: [],
          };
        }

        const message = sanitizeErrorMessage(error);
        const nextFailureCount = candidate.failureCount + 1;
        const isPermanentFailure =
          error instanceof AuthExpiredError || error instanceof ProviderPermanentError;
        const shouldDeactivate = isPermanentFailure && nextFailureCount >= params.maxFailures;
        const failureOutcome = await markRenewalFailure({
          subscriptionRowId: candidate.subscriptionRowId,
          calendarId: candidate.calendarId,
          nextFailureCount,
          shouldDeactivate,
          errorMessage: message,
        });

        log.error("subscription_renewal_failed", {
          event: "subscription_renewal_failed",
          calendarId: candidate.calendarId,
          provider,
          errorType: error instanceof Error ? error.name : "UnknownError",
          failureCount: nextFailureCount,
          error: message,
        });

        if (failureOutcome.markedInactive) {
          log.warn("subscription_marked_inactive", {
            event: "subscription_marked_inactive",
            calendarId: candidate.calendarId,
            provider,
            failureCount: nextFailureCount,
          });
        }

        if (error instanceof RateLimitedError && error.retryAfterSeconds && error.retryAfterSeconds > 0) {
          params.providerCooldownUntil.set(provider, Date.now() + error.retryAfterSeconds * 1000);
        }

        if (
          error instanceof AuthExpiredError ||
          error instanceof ProviderTransientError ||
          error instanceof ProviderPermanentError ||
          error instanceof RateLimitedError
        ) {
          const autoDisableTargets =
            failureOutcome.markedInactive && isPermanentFailure
              ? [
                  {
                    calendarId: candidate.calendarId,
                    provider,
                    providerAccountId: getProviderAccountIdForLock({
                      credentialKey: candidate.credentialKey,
                      credentialId: candidate.credentialId,
                    }),
                  },
                ]
              : [];
          if (autoDisableTargets.length > 0) {
            log.warn("subscription_auto_disable_queued", {
              event: "subscription_auto_disable_queued",
              calendarId: candidate.calendarId,
              provider,
              reason: "SUBSCRIPTION_RENEWAL_FAILED",
            });
          }
          return {
            attempted: 1,
            renewed: 0,
            recreated: 0,
            failed: 1,
            skippedLocked: 0,
            markedInactive: failureOutcome.markedInactive ? 1 : 0,
            autoDisableTargets,
          };
        }

        const autoDisableTargets =
          failureOutcome.markedInactive && isPermanentFailure
            ? [
                {
                  calendarId: candidate.calendarId,
                  provider,
                  providerAccountId: getProviderAccountIdForLock({
                    credentialKey: candidate.credentialKey,
                    credentialId: candidate.credentialId,
                  }),
                },
              ]
            : [];
        if (autoDisableTargets.length > 0) {
          log.warn("subscription_auto_disable_queued", {
            event: "subscription_auto_disable_queued",
            calendarId: candidate.calendarId,
            provider,
            reason: "SUBSCRIPTION_RENEWAL_FAILED",
          });
        }
        return {
          attempted: 1,
          renewed: 0,
          recreated: 0,
          failed: 1,
          skippedLocked: 0,
          markedInactive: failureOutcome.markedInactive ? 1 : 0,
          autoDisableTargets,
        };
      }
    });

    if (result !== null) {
      return result;
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 75 * 2 ** attempt));
    }
  }

  return {
    attempted: 0,
    renewed: 0,
    recreated: 0,
    failed: 0,
    skippedLocked: 1,
    markedInactive: 0,
    autoDisableTargets: [],
  };
};

export const runSubscriptionRenewalCron = async (
  params: RunSubscriptionRenewalCronParams = {}
): Promise<SubscriptionRenewalStats> => {
  const now = new Date();
  const batchSize = Math.max(1, params.batchSize ?? DEFAULT_BATCH_SIZE);
  const renewWithinHours = Math.max(1, params.renewWithinHours ?? DEFAULT_RENEW_WITHIN_HOURS);
  const maxFailures = Math.max(1, params.maxFailures ?? DEFAULT_MAX_FAILURES);
  const lockTtlMs = Math.max(5_000, params.lockTtlMs ?? DEFAULT_LOCK_TTL_MS);

  const threshold = new Date(now.getTime() + renewWithinHours * 60 * 60 * 1000);

  const stats: SubscriptionRenewalStats = {
    scanned: 0,
    attempted: 0,
    renewed: 0,
    recreated: 0,
    failed: 0,
    skippedLocked: 0,
    markedInactive: 0,
    autoDisableTargets: [],
  };

  log.info("subscription_renewal_scan_started", {
    event: "subscription_renewal_scan_started",
    at: now.toISOString(),
    threshold: threshold.toISOString(),
    batchSize,
    maxFailures,
  });

  const providerCooldownUntil = new Map<CalendarProvider, number>();
  let cursorId = 0;

  while (true) {
    const batch = await getRenewalCandidates({
      threshold,
      batchSize,
      cursorId,
    });

    if (batch.length === 0) {
      break;
    }

    for (const candidate of batch) {
      stats.scanned += 1;

      const result = await processCandidate({
        candidate,
        maxFailures,
        lockTtlMs,
        providerCooldownUntil,
      });

      stats.attempted += result.attempted;
      stats.renewed += result.renewed;
      stats.recreated += result.recreated;
      stats.failed += result.failed;
      stats.skippedLocked += result.skippedLocked;
      stats.markedInactive += result.markedInactive;
      if (result.autoDisableTargets.length > 0) {
        stats.autoDisableTargets.push(...result.autoDisableTargets);
      }

      cursorId = candidate.subscriptionRowId;
    }
  }

  if (stats.autoDisableTargets.length > 1) {
    const deduped = new Map<string, (typeof stats.autoDisableTargets)[number]>();
    for (const target of stats.autoDisableTargets) {
      deduped.set(`${target.provider}:${target.providerAccountId}:${target.calendarId}`, target);
    }
    stats.autoDisableTargets = [...deduped.values()];
  }

  return stats;
};
