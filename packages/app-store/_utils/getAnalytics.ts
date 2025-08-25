import { AnalyticsServiceMap } from "analytics.services.generated";

import logger from "@calcom/lib/logger";
import type { AnalyticsService, AnalyticsServiceClass } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["AnalyticsManager"] });

interface AnalyticsApp {
  lib: {
    AnalyticsService: AnalyticsServiceClass;
  };
}

const isAnalyticsService = (x: unknown): x is AnalyticsApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "AnalyticsService" in x.lib;

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
  const analyticsService = analyticsApp.default;

  if (!isAnalyticsService(analyticsService)) {
    log.warn(`Analytics is not implemented`);
    return null;
  }

  return new analyticsService(credential);
};
