import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { RateLimitHelper } from "./rateLimit";
import { rateLimiter } from "./rateLimit";
import sendEmailWithNodeMailer from "./sendEmailWithNodeMailer";

type SMSLockEntityType = "user" | "team" | "ip";

export type SMSRateLimitContext = {
  userId?: number | null;
  calIdTeamId?: number | null;
  ipAddress?: string | null;
  provider?: string | null;
  channel?: "SMS" | "WHATSAPP";
  metadata?: Record<string, unknown>;
};

type ExtendedRateLimitHelper = RateLimitHelper & {
  smsRateLimitContext?: SMSRateLimitContext;
};

export async function checkRateLimitAndThrowError({
  rateLimitingType = "core",
  identifier,
  onRateLimiterResponse,
  opts,
}: RateLimitHelper) {
  const response = await rateLimiter()({ rateLimitingType, identifier, opts });

  const { success, reset } = response;

  if (onRateLimiterResponse) onRateLimiterResponse(response);

  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: getRateLimitExceededMessage(reset),
    });
  }
  return response;
}

export async function checkSMSRateLimit({
  rateLimitingType = "sms",
  identifier,
  onRateLimiterResponse,
  opts,
  smsRateLimitContext,
}: ExtendedRateLimitHelper) {
  await throwIfLockedIdentifier(identifier);

  const response = await rateLimiter()({ rateLimitingType, identifier, opts });
  const { success, reset } = response;

  if (onRateLimiterResponse) onRateLimiterResponse(response);

  if (!success) {
    await autoLockFromIdentifier(identifier, smsRateLimitContext);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: getRateLimitExceededMessage(reset),
    });
  }

  return response;
}

export async function enforceSMSAbusePrevention(context: SMSRateLimitContext) {
  const userId = context.userId ?? null;
  const calIdTeamId = context.calIdTeamId ?? null;
  const ipAddress = normalizeIdentifier(context.ipAddress);

  if (calIdTeamId) {
    const locked = await isTeamLocked(calIdTeamId);
    if (locked) throwLockedError("team", calIdTeamId.toString());
  }

  if (userId) {
    const locked = await isUserLocked(userId);
    if (locked) throwLockedError("user", userId.toString());
  }

  if (ipAddress) {
    const locked = await isIpLocked(ipAddress);
    if (locked) throwLockedError("ip", ipAddress);
  }

  if (userId) {
    await checkSMSRateLimit({
      identifier: `sms:user:${userId}`,
      rateLimitingType: "smsMonth",
      smsRateLimitContext: context,
    });
  }

  if (calIdTeamId) {
    await checkSMSRateLimit({
      identifier: `sms:team:${calIdTeamId}`,
      rateLimitingType: "sms",
      smsRateLimitContext: context,
    });
  }

  if (ipAddress) {
    await checkSMSRateLimit({
      identifier: `sms:ip:${ipAddress}`,
      rateLimitingType: "sms",
      smsRateLimitContext: context,
    });
  }
}

function getRateLimitExceededMessage(reset: number) {
  const secondsToWait = Math.max(0, Math.floor((reset - Date.now()) / 1000));
  return `Rate limit exceeded. Try again in ${secondsToWait} seconds.`;
}

function normalizeIdentifier(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 255) : null;
}

function parseLockEntityFromIdentifier(identifier: string): {
  entityType: SMSLockEntityType;
  entityId: string;
} | null {
  const parts = identifier.split(":");
  if (parts.length < 3) return null;

  const maybeType = parts[1];
  const rawId = parts.slice(2).join(":");

  if (!rawId) return null;

  if (maybeType === "user") return { entityType: "user", entityId: rawId };
  if (maybeType === "team") return { entityType: "team", entityId: rawId };
  if (maybeType === "ip") return { entityType: "ip", entityId: rawId };

  return null;
}

async function throwIfLockedIdentifier(identifier: string) {
  const parsed = parseLockEntityFromIdentifier(identifier);
  if (!parsed) return;

  const entityId = parsed.entityId;

  if (parsed.entityType === "user") {
    const userId = Number(entityId);
    if (!Number.isNaN(userId) && (await isUserLocked(userId))) {
      throwLockedError("user", entityId);
    }
    return;
  }

  if (parsed.entityType === "team") {
    const teamId = Number(entityId);
    if (!Number.isNaN(teamId) && (await isTeamLocked(teamId))) {
      throwLockedError("team", entityId);
    }
    return;
  }

  if (parsed.entityType === "ip") {
    if (await isIpLocked(entityId)) {
      throwLockedError("ip", entityId);
    }
  }
}

function throwLockedError(entityType: SMSLockEntityType, entityId: string) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `SMS sending is locked for ${entityType}:${entityId}`,
  });
}

async function isUserLocked(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { smsLockState: true },
  });

  if (user?.smsLockState === SMSLockState.LOCKED) {
    return true;
  }

  const lockedTeamMembership = await prisma.membership.findFirst({
    where: {
      userId,
      team: {
        smsLockState: SMSLockState.LOCKED,
      },
    },
    select: { id: true },
  });

  if (lockedTeamMembership) {
    return true;
  }

  const lockedCalIdTeamMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId,
      calIdTeam: {
        smsLockState: SMSLockState.LOCKED,
      },
    },
    select: { id: true },
  });

  return !!lockedCalIdTeamMembership;
}

async function isTeamLocked(teamId: number) {
  const calIdTeam = await prisma.calIdTeam.findUnique({
    where: { id: teamId },
    select: { smsLockState: true },
  });

  return calIdTeam?.smsLockState === SMSLockState.LOCKED;
}

async function isIpLocked(entityIdentifier: string) {
  const locks = await prisma.$queryRaw<Array<{ lockState: SMSLockState }>>(Prisma.sql`
    SELECT "lockState"
    FROM "SMSAbuseLock"
    WHERE "entityType" = ${"IP"}::"SMSAbuseEntityType"
      AND "entityIdentifier" = ${entityIdentifier}
    LIMIT 1
  `);

  return locks[0]?.lockState === SMSLockState.LOCKED;
}

async function autoLockFromIdentifier(identifier: string, context?: SMSRateLimitContext) {
  const parsed = parseLockEntityFromIdentifier(identifier);
  if (!parsed) return;

  if (parsed.entityType === "user") {
    const userId = Number(parsed.entityId);
    if (!Number.isNaN(userId)) {
      await lockUserOnRateLimitBreach(userId, context);
    }
    return;
  }

  if (parsed.entityType === "team") {
    const teamId = Number(parsed.entityId);
    if (!Number.isNaN(teamId)) {
      await lockTeamOnRateLimitBreach(teamId, context);
    }
    return;
  }

  if (parsed.entityType === "ip") {
    await lockIpOnRateLimitBreach(parsed.entityId, context);
  }
}

async function lockUserOnRateLimitBreach(userId: number, context?: SMSRateLimitContext) {
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      smsLockState: {
        not: SMSLockState.LOCKED,
      },
    },
    data: {
      smsLockState: SMSLockState.LOCKED,
      smsLockReviewedByAdmin: false,
    },
  });

  if (result.count > 0) {
    await sendAutoLockAlert({
      entityType: "user",
      entityIdentifier: userId.toString(),
      context,
    });
  }
}

async function lockTeamOnRateLimitBreach(teamId: number, context?: SMSRateLimitContext) {
  const calIdResult = await prisma.calIdTeam.updateMany({
    where: {
      id: teamId,
      smsLockState: {
        not: SMSLockState.LOCKED,
      },
    },
    data: {
      smsLockState: SMSLockState.LOCKED,
    },
  });

  if (calIdResult.count > 0) {
    await sendAutoLockAlert({
      entityType: "team",
      entityIdentifier: teamId.toString(),
      context,
    });
  }
}

async function lockIpOnRateLimitBreach(entityIdentifier: string, context?: SMSRateLimitContext) {
  const timestamp = new Date();
  const metadata = JSON.stringify(buildAlertMetadata(context));
  const provider = context?.provider || "UNKNOWN";

  const result = await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SMSAbuseLock" (
      "entityType",
      "entityIdentifier",
      "lockState",
      "reason",
      "provider",
      "metadata",
      "lockedAt",
      "lastAlertedAt",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${"IP"}::"SMSAbuseEntityType",
      ${entityIdentifier},
      ${SMSLockState.LOCKED}::"SMSLockState",
      ${"rate limit breach"},
      ${provider},
      ${metadata}::jsonb,
      ${timestamp},
      ${timestamp},
      ${timestamp},
      ${timestamp}
    )
    ON CONFLICT ("entityType", "entityIdentifier")
    DO UPDATE
      SET "lockState" = EXCLUDED."lockState",
          "reason" = EXCLUDED."reason",
          "provider" = EXCLUDED."provider",
          "metadata" = EXCLUDED."metadata",
          "lockedAt" = EXCLUDED."lockedAt",
          "lastAlertedAt" = EXCLUDED."lastAlertedAt",
          "updatedAt" = EXCLUDED."updatedAt"
    WHERE "SMSAbuseLock"."lockState" <> ${SMSLockState.LOCKED}::"SMSLockState"
  `);

  if (result > 0) {
    await sendAutoLockAlert({
      entityType: "ip",
      entityIdentifier,
      context,
      lockTimestamp: timestamp,
    });
  }
}

function buildAlertMetadata(context?: SMSRateLimitContext) {
  return {
    userId: context?.userId ?? null,
    teamId: context?.calIdTeamId ?? null,
    ipAddress: context?.ipAddress ?? null,
    channel: context?.channel ?? null,
    ...(context?.metadata ?? {}),
  };
}

async function sendAutoLockAlert({
  entityType,
  entityIdentifier,
  context,
  lockTimestamp,
}: {
  entityType: SMSLockEntityType;
  entityIdentifier: string;
  context?: SMSRateLimitContext;
  lockTimestamp?: Date;
}) {
  const timestamp = (lockTimestamp ?? new Date()).toISOString();
  const provider = context?.provider || "UNKNOWN";

  const metadata = buildAlertMetadata(context);

  const lines = [
    "SMS abuse auto-lock triggered.",
    "",
    `entityType: ${entityType}`,
    `entityIdentifier: ${entityIdentifier}`,
    "reason: rate limit breach",
    `provider: ${provider}`,
    `timestamp: ${timestamp}`,
    "",
    "context:",
    JSON.stringify(metadata, null, 2),
  ];

  try {
    await sendEmailWithNodeMailer({
      to: "reports@cal.id",
      subject: `[Cal ID] SMS abuse auto-lock: ${entityType}:${entityIdentifier}`,
      body: lines.join("\n"),
      isHtml: false,
    });
  } catch (error) {
    console.error("Failed to send SMS abuse auto-lock alert", error);
  }
}
