import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import HrmsManager from "@calcom/lib/hrmsManager/hrmsManager";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { OutOfOfficeReason } from "@calcom/prisma/client";
import { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({
  prefix: [`[outOfOfficeReasons.handler]`],
});

interface OutOfOfficeReasonsHandlerOptions {
  ctx?: {
    user: TrpcSessionUser;
  };
}

interface HrmsReason {
  id: string;
  name: string;
  source: string;
}

interface HrmsReasonListResult {
  hasHrmsIntegration: boolean;
  reasons: HrmsReason[];
}

/**
 * Returns the list of Cal.com OOO reasons (static reasons from the database)
 */
export async function outOfOfficeReasonList(
  _options?: OutOfOfficeReasonsHandlerOptions
): Promise<OutOfOfficeReason[]> {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  return outOfOfficeReasons;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Returns the list of HRMS OOO reasons from connected HRMS integrations
 * These are fetched dynamically from the HRMS provider (e.g., Deel)
 */
export async function hrmsReasonList(
  options?: OutOfOfficeReasonsHandlerOptions
): Promise<HrmsReasonListResult> {
  if (!options?.ctx?.user?.email) {
    log.debug("No user context provided, returning empty HRMS reasons");
    return { hasHrmsIntegration: false, reasons: [] };
  }

  try {
    const { user } = options.ctx;

    const hrmsCredentials = await CredentialRepository.findCredentialsByUserIdAndCategory({
      userId: user.id,
      category: [AppCategories.hrms],
    });

    if (hrmsCredentials.length === 0) {
      return { hasHrmsIntegration: false, reasons: [] };
    }

    const hrmsReasons: HrmsReason[] = [];

    for (const credential of hrmsCredentials) {
      try {
        const hrmsManager = new HrmsManager(credential);
        const reasons = await hrmsManager.listOOOReasons(user.email);

        const mappedReasons = reasons.map((reason) => ({
          id: reason.externalId,
          name: reason.name,
          source: credential.appId || "unknown",
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

    return {
      hasHrmsIntegration: true,
      reasons: hrmsReasons,
    };
  } catch (error) {
    log.error("Error fetching HRMS OOO reasons", {
      error: getErrorMessage(error),
    });
    return { hasHrmsIntegration: false, reasons: [] };
  }
}
