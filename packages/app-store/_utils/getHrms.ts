import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService, HrmsServiceClass } from "@calcom/types/HrmsService";

import appStore from "..";

const log = logger.getSubLogger({ prefix: ["HrmsManager"] });

interface HrmsApp {
  lib: {
    HrmsService: HrmsServiceClass;
  };
}

const isHrmsService = (x: unknown): x is HrmsApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "HrmsService" in x.lib;

export const getHrmsService = async ({
  credential,
}: {
  credential: CredentialPayload;
}): Promise<HrmsService | null> => {
  if (!credential || !credential.key) return;

  const { type: hrmsType } = credential;

  const hrmsName = hrmsType.split("_")[0];

  const hrmsAppImportFn = appStore[hrmsName as keyof typeof appStore];

  if (!hrmsAppImportFn) {
    log.warn(`${hrmsName}: hrms app not implemented`);
    return null;
  }

  const hrmsApp = await hrmsAppImportFn();

  if (!isHrmsService(hrmsApp)) {
    log.warn(`${hrmsName}: Hrms is not implemented`);
  }

  const HrmsService = hrmsApp.lib.HrmsService;

  log.info("Got hrmsApp", HrmsService);

  return new HrmsService(credential);
};
