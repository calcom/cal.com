import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import { CrmServiceMap } from "../crm.apps.generated";

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export const getCrm = async (credential: CredentialPayload, appOptions?: Record<string, unknown>) => {
  if (!credential || !credential.key) return null;
  const { type: crmType } = credential;

  const crmName = crmType.split("_")[0];

  const crmServiceImportFn = await CrmServiceMap[crmName as keyof typeof CrmServiceMap];

  if (!crmServiceImportFn) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  const createCrmService = crmServiceImportFn.default;

  if (!createCrmService) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  // CRM services now export factory functions instead of classes
  // to prevent SDK types from leaking into the type system
  return createCrmService(credential, appOptions);
};

export default getCrm;
