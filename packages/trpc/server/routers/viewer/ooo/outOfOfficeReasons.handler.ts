import HrmsManager from "@calcom/lib/hrmsManager/hrmsManager";
import logger from "@calcom/lib/logger";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

const log = logger.getSubLogger({ prefix: [`[outOfOfficeReasons.handler]`] });

interface OutOfOfficeReasonsHandlerOptions {
  ctx?: {
    user: TrpcSessionUser;
  };
}

export const outOfOfficeReasonList = async (options?: OutOfOfficeReasonsHandlerOptions) => {
  const outOfOfficeReasons = await prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  if (!options?.ctx?.user?.email) {
    log.debug("No user context provided, returning static reasons only");
    return outOfOfficeReasons;
  }

  try {
    const { user } = options.ctx;

    const hrmsCredentials = await CredentialRepository.findCredentialsByUserIdAndCategory({
      userId: user.id,
      category: [AppCategories.hrms],
    });

    const hrmsReasons = [];
    for (const credential of hrmsCredentials) {
      try {
        const hrmsManager = new HrmsManager(credential);
        const reasons = await hrmsManager.listOOOReasons(user.email);

        const mappedReasons = reasons.map((reason) => ({
          id: reason.id,
          name: reason.name,
          reason: reason.name,
          userId: null,
          enabled: true,
          externalId: reason.externalId,
          emoji: null,
        }));

        hrmsReasons.push(...mappedReasons);
        log.info("Successfully fetched HRMS OOO reasons", {
          appId: credential.appId,
          count: reasons.length,
        });
      } catch (error) {
        log.error("Failed to fetch HRMS OOO reasons", {
          appId: credential.appId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (hrmsReasons.length > 0) {
      log.info("Returning policies from HRMS", { count: hrmsReasons.length });
      return hrmsReasons;
    }

    log.debug("No HRMS reasons found, falling back to static reasons");
    return outOfOfficeReasons;
  } catch (error) {
    log.error("Error fetching HRMS OOO reasons, falling back to static reasons", {
      error: error instanceof Error ? error.message : String(error),
    });
    return outOfOfficeReasons;
  }
};
