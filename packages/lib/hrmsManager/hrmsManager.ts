import { getHrmsService } from "@calcom/app-store/_utils/getHrms";
import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService } from "@calcom/types/HrmsService";

const log = logger.getSubLogger({ prefix: ["HrmsManager"] });

export default class HrmsManager {
  hrmsService: HrmsService | null | undefined = null;
  credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private async getHrmsService(credential: CredentialPayload) {
    if (this.hrmsService) return this.hrmsService;

    const hrmsService = await getHrmsService({ credential });
    this.hrmsService = hrmsService;

    if (!this.hrmsService) {
      log.error("Hrms service initialization failed");
    }

    return analyticsService;
  }

  public async createOOO(props: any) {
    const hrmsService = await this.getHrmsService(this.credential);
    if (!hrmsService) return;

    return await hrmsService.createOOO(props);
  }
}
