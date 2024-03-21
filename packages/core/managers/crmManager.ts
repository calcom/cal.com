import getCrm from "@calcom/app-store/_utils/getCrm";
import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export default class CrmManager {
  crmService: CRM | null | undefined = null;
  constructor(credential: CredentialPayload) {
    this.initialize(credential);
    console.log("🚀 ~ CrmManager ~ constructor ~ this.crmService:", this.crmService);
  }

  private async initialize(credential: CredentialPayload) {
    const response = await getCrm(credential);
    this.crmService = response;

    if (this.crmService === null) {
      console.log("💀 Error initializing CRM service");
      log.error("CRM service initialization failed");
    }
  }
}
