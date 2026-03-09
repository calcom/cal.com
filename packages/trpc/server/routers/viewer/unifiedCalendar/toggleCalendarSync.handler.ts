import { dispatcher, JobName } from "@calid/job-dispatcher";
import type { CalendarSyncJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/lib/CalendarManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TToggleCalendarSyncInput, TToggleCalendarSyncOutput } from "./toggleCalendarSync.schema";

interface CalendarOwnershipRow {
  externalCalendarId: number;
  syncEnabled: boolean;
}

interface BooleanRow {
  value: boolean;
}

interface ConnectedCalendarCandidate {
  calendarName: string | null;
  isPrimary: boolean;
}

type ToggleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TToggleCalendarSyncInput;
};

const log = logger.getSubLogger({ prefix: ["viewer", "unifiedCalendar", "toggleSync"] });

const toProviderSlug = (provider: "GOOGLE" | "OUTLOOK"): "google" | "outlook" =>
  provider === "GOOGLE" ? "google" : "outlook";

const sanitizeKeyPart = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "_");

const providerCredentialTypePredicate = (provider: "GOOGLE" | "OUTLOOK"): Prisma.Sql => {
  if (provider === "GOOGLE") {
    return Prisma.sql`c."type" ILIKE '%google%calendar%'`;
  }
  return Prisma.sql`(c."type" ILIKE '%office365%' OR c."type" ILIKE '%outlook%' OR c."type" ILIKE '%microsoft%')`;
};

const isIntegrationTypeForProvider = (provider: "GOOGLE" | "OUTLOOK", integrationType: string): boolean => {
  const normalized = integrationType.toLowerCase();
  if (provider === "GOOGLE") {
    return normalized.includes("google");
  }
  return (
    normalized.includes("office365") || normalized.includes("outlook") || normalized.includes("microsoft")
  );
};

const findTrackedCalendarOwnedByUser = async (params: {
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
  providerCalendarId: string;
}): Promise<CalendarOwnershipRow | null> => {
  const rows = await prisma.$queryRaw<CalendarOwnershipRow[]>(
    Prisma.sql`
      SELECT
        ec."id" AS "externalCalendarId",
        ec."syncEnabled"
      FROM "ExternalCalendar" ec
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE c."userId" = ${params.userId}
        AND ec."provider" = CAST(${params.provider} AS "CalendarProvider")
        AND ec."credentialId" = ${params.credentialId}
        AND ec."providerCalendarId" = ${params.providerCalendarId}
      LIMIT 1
    `
  );

  return rows[0] ?? null;
};

const isCredentialOwnedByUser = async (params: {
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
}): Promise<boolean> => {
  const rows = await prisma.$queryRaw<BooleanRow[]>(
    Prisma.sql`
      SELECT true AS "value"
      FROM "Credential" c
      WHERE c."id" = ${params.credentialId}
        AND c."userId" = ${params.userId}
        AND ${providerCredentialTypePredicate(params.provider)}
      LIMIT 1
    `
  );

  return Boolean(rows[0]?.value);
};

const findConnectedCalendarCandidateOwnedByUser = async (params: {
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
  providerCalendarId: string;
}): Promise<ConnectedCalendarCandidate | null> => {
  const credential = await prisma.credential.findFirst({
    where: {
      id: params.credentialId,
      userId: params.userId,
    },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    return null;
  }

  const calendarCredentials = getCalendarCredentials([credential]);

  const { connectedCalendars } = await getConnectedCalendars(calendarCredentials, []);
  const connectedCalendar = connectedCalendars.find(
    (item) =>
      item.credentialId === params.credentialId &&
      isIntegrationTypeForProvider(params.provider, item.integration.type)
  );
  const candidate = connectedCalendar?.calendars?.find(
    (calendar) => calendar.externalId === params.providerCalendarId
  );

  if (!candidate) {
    return null;
  }

  return {
    calendarName: candidate.name ?? null,
    isPrimary: Boolean(candidate.primary) || candidate.externalId === "primary",
  };
};

const ensureExternalCalendarTracked = async (params: {
  credentialId: number;
  provider: "GOOGLE" | "OUTLOOK";
  providerCalendarId: string;
  calendarName: string | null;
  isPrimary: boolean;
}): Promise<CalendarOwnershipRow | null> => {
  const rows = await prisma.$queryRaw<CalendarOwnershipRow[]>(
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
        ${params.credentialId},
        CAST(${params.provider} AS "CalendarProvider"),
        ${params.providerCalendarId},
        ${params.calendarName},
        ${params.isPrimary},
        false,
        CAST(${"IDLE"} AS "CalendarSyncStatus"),
        NOW(),
        NOW()
      )
      ON CONFLICT ("credentialId", "providerCalendarId")
      DO UPDATE SET
        "provider" = CAST(${params.provider} AS "CalendarProvider"),
        "calendarName" = EXCLUDED."calendarName",
        "isPrimary" = EXCLUDED."isPrimary",
        "updatedAt" = NOW()
      RETURNING "id" AS "externalCalendarId", "syncEnabled"
    `
  );

  return rows[0] ?? null;
};

const updateSyncEnabled = async (params: {
  externalCalendarId: number;
  enabled: boolean;
  syncDisabledReason?: "USER_DISCONNECTED" | "USER_TOGGLED_OFF" | "SUBSCRIPTION_RENEWAL_FAILED" | null;
  syncDisabledBy?: "USER" | "SYSTEM" | null;
  syncDisabledAt?: Date | null;
}) => {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "ExternalCalendar"
      SET
        "syncEnabled" = ${params.enabled},
        "syncStatus" = CAST(${"IDLE"} AS "CalendarSyncStatus"),
        "syncDisabledReason" = ${
          params.syncDisabledReason
            ? Prisma.sql`CAST(${params.syncDisabledReason} AS "CalendarSyncDisabledReason")`
            : Prisma.sql`NULL`
        },
        "syncDisabledBy" = ${
          params.syncDisabledBy
            ? Prisma.sql`CAST(${params.syncDisabledBy} AS "CalendarSyncDisabledBy")`
            : Prisma.sql`NULL`
        },
        "syncDisabledAt" = ${params.syncDisabledAt ?? null},
        "updatedAt" = NOW()
      WHERE "id" = ${params.externalCalendarId}
    `
  );
};

const enqueueCalendarSyncAction = async (params: {
  externalCalendarId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
  providerCalendarId: string;
  enabled: boolean;
}): Promise<void> => {
  const bucket = Math.floor(Date.now() / 15_000);
  const providerSlug = toProviderSlug(params.provider);
  const safeProviderCalendarId = sanitizeKeyPart(params.providerCalendarId);

  const payload: CalendarSyncJobData = {
    name: JobName.CALENDAR_SYNC,
    action: params.enabled ? "initialSync" : "disableCalendarSync",
    calendarId: params.externalCalendarId,
    provider: providerSlug,
    credentialId: params.credentialId,
    providerCalendarId: params.providerCalendarId,
    reason: "manual",
    disableReason: params.enabled ? undefined : "user",
    syncDisabledReason: params.enabled ? undefined : "USER_TOGGLED_OFF",
  };

  await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: payload,
    bullmqOptions: {
      jobId: `${params.enabled ? "initialSync" : "disableSync"}:${providerSlug}:${
        params.credentialId
      }:${safeProviderCalendarId}:${bucket}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 2000,
      },
    },
  });
};

export const toggleCalendarSyncHandler = async ({
  ctx,
  input,
}: ToggleOptions): Promise<TToggleCalendarSyncOutput> => {
  console.log("in_here_inside_toggleCalendarSyncHandler");
  const userId = ctx.user?.id;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const credentialOwned = await isCredentialOwnedByUser({
    userId,
    provider: input.provider,
    credentialId: input.credentialId,
  });
  if (!credentialOwned) {
    if (!input.enabled) {
      return { enabled: false, enqueued: false };
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  const connectedCandidate = input.enabled
    ? await findConnectedCalendarCandidateOwnedByUser({
        userId,
        provider: input.provider,
        credentialId: input.credentialId,
        providerCalendarId: input.providerCalendarId,
      })
    : null;

  if (input.enabled && !connectedCandidate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  const trackedCalendar = await findTrackedCalendarOwnedByUser({
    userId,
    provider: input.provider,
    credentialId: input.credentialId,
    providerCalendarId: input.providerCalendarId,
  });

  const resolvedCalendar =
    trackedCalendar ??
    (input.enabled
      ? await ensureExternalCalendarTracked({
          credentialId: input.credentialId,
          provider: input.provider,
          providerCalendarId: input.providerCalendarId,
          calendarName: connectedCandidate?.calendarName ?? null,
          isPrimary: connectedCandidate?.isPrimary ?? input.providerCalendarId === "primary",
        })
      : null);

  if (!resolvedCalendar) {
    if (!input.enabled) {
      return { enabled: false, enqueued: false };
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  if (resolvedCalendar.syncEnabled === input.enabled) {
    return { enabled: input.enabled, enqueued: false };
  }

  await updateSyncEnabled({
    externalCalendarId: resolvedCalendar.externalCalendarId,
    enabled: input.enabled,
    syncDisabledReason: input.enabled ? null : "USER_TOGGLED_OFF",
    syncDisabledBy: input.enabled ? null : "USER",
    syncDisabledAt: input.enabled ? null : new Date(),
  });

  try {
    await enqueueCalendarSyncAction({
      externalCalendarId: resolvedCalendar.externalCalendarId,
      provider: input.provider,
      credentialId: input.credentialId,
      providerCalendarId: input.providerCalendarId,
      enabled: input.enabled,
    });
  } catch (error) {
    await updateSyncEnabled({
      externalCalendarId: resolvedCalendar.externalCalendarId,
      enabled: resolvedCalendar.syncEnabled,
      syncDisabledReason: resolvedCalendar.syncEnabled ? null : "USER_TOGGLED_OFF",
      syncDisabledBy: resolvedCalendar.syncEnabled ? null : "USER",
      syncDisabledAt: resolvedCalendar.syncEnabled ? null : new Date(),
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to enqueue calendar sync job",
      cause: error,
    });
  }

  log.info("calendar_sync_toggle_updated", {
    event: "calendar_sync_toggle_updated",
    userId,
    externalCalendarId: resolvedCalendar.externalCalendarId,
    provider: input.provider,
    credentialId: input.credentialId,
    providerCalendarId: input.providerCalendarId,
    enabled: input.enabled,
    enqueued: true,
  });

  return { enabled: input.enabled, enqueued: true };
};
