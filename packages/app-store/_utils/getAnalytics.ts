import logger from "@calcom/lib/logger";
import type { AnalyticsService, AnalyticsServiceClass } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";

import appStore from "..";

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

  const analyticsAppImportFn = appStore[analyticsName as keyof typeof appStore];

  if (!analyticsAppImportFn) {
    log.warn(`analytics app not implemented`);
    return null;
  }

  const analyticsApp = await analyticsAppImportFn();

  if (!isAnalyticsService(analyticsApp)) {
    log.warn(`Analytics is not implemented`);
    return null;
  }

  const AnalyticsService = analyticsApp.lib.AnalyticsService;
  log.info("Got analyticsApp", AnalyticsService);

  return new AnalyticsService(credential);
};
