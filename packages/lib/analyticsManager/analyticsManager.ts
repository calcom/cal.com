import { getAnalyticsService } from "@calcom/app-store/_utils/getAnalytics";
import logger from "@calcom/lib/logger";
import type { AnalyticsService, SendEventProps } from "@calcom/types/AnalyticsService";
import type { CredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["AnalyticsManager"] });
export default class AnalyticsManager {
  analyticsService: AnalyticsService | null | undefined = null;
  credential: CredentialPayload;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private async getAnalyticsService(credential: CredentialPayload) {
    if (this.analyticsService) return this.analyticsService;
    const analyticsService = await getAnalyticsService({ credential });
    this.analyticsService = analyticsService;

    if (!this.analyticsService) {
      log.error("Analytics service initialization failed");
    }

    return analyticsService;
  }

  public async sendEvent(props: SendEventProps) {
    const analyticsService = await this.getAnalyticsService(this.credential);
    if (!analyticsService) return;

    return await analyticsService.sendEvent(props);
  }
}
