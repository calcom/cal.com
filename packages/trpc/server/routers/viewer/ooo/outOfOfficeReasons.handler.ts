import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import HrmsManager from "@calcom/lib/hrmsManager/hrmsManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({
  prefix: [`[outOfOfficeReasons.handler]`],
});

interface OutOfOfficeReasonsHandlerOptions {
  ctx: {
    user: TrpcSessionUser;
  };
}

interface OOOReason {
  id: number;
  emoji: string | null;
  reason: string;
  userId: number | null;
  enabled: boolean;
  hrmsSource?: string | null;
  hrmsReasonId?: string | null;
}

export interface OutOfOfficeReasonListResult {
  hasHrmsIntegration: boolean;
  reasons: OOOReason[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Returns the list of OOO reasons.
 * If HRMS integration is installed, returns HRMS reasons.
 * Otherwise, returns Cal.com static reasons from the database.
 */
export async function outOfOfficeReasonList(
  options: OutOfOfficeReasonsHandlerOptions
): Promise<OutOfOfficeReasonListResult> {
  const { user } = options.ctx;

  if (!user) {
    const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
      where: { enabled: true },
    });

    return {
      hasHrmsIntegration: false,
      reasons: outOfOfficeReasons.map((reason) => ({
        id: reason.id,
        emoji: reason.emoji,
        reason: reason.reason,
        userId: reason.userId,
        enabled: reason.enabled,
        hrmsSource: null,
        hrmsReasonId: null,
      })),
    };
  }

  const hrmsCredentials = await CredentialRepository.findCredentialsByUserIdAndCategory({
    userId: user.id,
    category: [AppCategories.hrms],
  });

  if (hrmsCredentials.length > 0 && user.email) {
    const hrmsReasons: OOOReason[] = [];
    let reasonId = -1;

    for (const credential of hrmsCredentials) {
      try {
        const hrmsManager = new HrmsManager(credential);
        const reasons = await hrmsManager.listOOOReasons(user.email);

        const mappedReasons: OOOReason[] = reasons.map((reason) => ({
          id: reasonId--,
          emoji: null,
          reason: reason.name,
          userId: null,
          enabled: true,
          hrmsSource: credential.appId || "unknown",
          hrmsReasonId: reason.externalId,
        }));

        hrmsReasons.push(...mappedReasons);
        log.info("Successfully fetched HRMS OOO reasons", {
          appId: credential.appId,
          count: reasons.length,
        });
      } catch (error) {
        log.error("Failed to fetch HRMS OOO reasons", {
          appId: credential.appId,
          error: getErrorMessage(error),
        });
      }
    }

    if (hrmsReasons.length > 0) {
      return {
        hasHrmsIntegration: true,
        reasons: hrmsReasons,
      };
    }
  }

  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  const calComReasons: OOOReason[] = outOfOfficeReasons.map((reason) => ({
    id: reason.id,
    emoji: reason.emoji,
    reason: reason.reason,
    userId: reason.userId,
    enabled: reason.enabled,
    hrmsSource: null,
    hrmsReasonId: null,
  }));

  return {
    hasHrmsIntegration: false,
    reasons: calComReasons,
  };
}
