import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

import { CrmServiceMap } from "../crm.apps.generated";

type Class<I, Args extends any[] = any[]> = new (...args: Args) => I;

type CrmClass = Class<CRM, [CredentialPayload, any]>;

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export const getCrm = async (credential: CredentialPayload, appOptions: any) => {
  if (!credential || !credential.key) return null;
  const { type: crmType } = credential;

  const crmName = crmType.split("_")[0];

  const crmServiceImportFn = await CrmServiceMap[crmName as keyof typeof CrmServiceMap];

  if (!crmServiceImportFn) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  const CrmService = crmServiceImportFn.default;

  if (!CrmService) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  return new CrmService(credential, appOptions);
};

export default getCrm;
