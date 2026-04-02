import logger from "@calcom/lib/logger";
import type { AnalyticsService } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";
import { AnalyticsServiceMap } from "../analytics.services.generated";

const log = logger.getSubLogger({ prefix: ["AnalyticsManager"] });

export const getAnalyticsService = async ({
  credential,
}: {
  credential: CredentialPayload;
}): Promise<AnalyticsService | null> => {
  if (!credential || !credential.key) return null;
  const { type: analyticsType } = credential;

  const analyticsName = analyticsType.split("_")[0];

  const analyticsAppImportFn = AnalyticsServiceMap[analyticsName as keyof typeof AnalyticsServiceMap];

  if (!analyticsAppImportFn) {
    log.warn(`analytics app not implemented`);
    return null;
  }

  const analyticsApp = await analyticsAppImportFn;

  const createAnalyticsService = analyticsApp.default;

  if (!createAnalyticsService || typeof createAnalyticsService !== "function") {
    log.warn(`analytics of type ${analyticsType} is not implemented`);
    return null;
  }

  return createAnalyticsService(credential);
};
