import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService } from "@calcom/types/HrmsService";

import { HrmsServiceMap } from "../hrms.apps.generated";

const log = logger.getSubLogger({ prefix: ["HrmsManager"] });

export const getHrmsService = async ({
  credential,
}: {
  credential: CredentialPayload;
}): Promise<HrmsService | null> => {
  if (!credential || !credential.key) return null;

  const { type: hrmsType } = credential;
  const hrmsName = hrmsType.split("_")[0];

  const hrmsServiceImportFn = HrmsServiceMap[hrmsName as keyof typeof HrmsServiceMap];

  if (!hrmsServiceImportFn) {
    log.warn(`hrms of type ${hrmsType} is not implemented`);
    return null;
  }

  const hrmsServiceModule = await hrmsServiceImportFn;
  const HrmsService = hrmsServiceModule.default;

  if (!HrmsService) {
    log.warn(`hrms of type ${hrmsType} is not implemented`);
    return null;
  }

  return new HrmsService(credential);
};
