import { getDub } from "@calcom/app-store/_utils/getDub";
import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { DUB } from "@calcom/types/DubService";

const log = logger.getSubLogger({ prefix: ["DubManager"] });
export default class DubManager {
  dubService: DUB | null | undefined = null;
  credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private async getDubService(credential: CredentialPayload) {
    if (this.dubService) return this.dubService;
    const dubService = await getDub({ credential });
    this.dubService = dubService;

    if (!this.dubService) {
      console.log("💀 Error initializing DUB service");
      log.error("Dub service initialization failed");
    }

    return dubService;
  }

  public async trackLead(props: { clickId: string; name: string; email: string; externalId?: string }) {
    const dubService = await this.getDubService(this.credential);
    if (!dubService) return;

    return await dubService.trackLead(props);
  }
}
