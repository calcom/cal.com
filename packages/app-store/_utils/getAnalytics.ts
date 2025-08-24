import logger from "@calcom/lib/logger";
import type { AnalyticsService, AnalyticsServiceClass } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";

import { ANALYTICS_SERVICES } from "../analytics.apps.generated";

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

  // Use the generated analytics services map
  const modFactory = (ANALYTICS_SERVICES as Record<string, any>)[analyticsName];

  if (!modFactory) {
    log.warn(`analytics app '${analyticsName}' not found in ANALYTICS_SERVICES`);
    return null;
  }

  const analyticsApp = await modFactory();

  if (!isAnalyticsService(analyticsApp)) {
    log.warn(`Analytics is not implemented for '${analyticsName}'`);
    return null;
  }

  const AnalyticsService = analyticsApp.lib.AnalyticsService;
  log.info("Got analyticsApp", AnalyticsService);

  return new AnalyticsService(credential);
};
