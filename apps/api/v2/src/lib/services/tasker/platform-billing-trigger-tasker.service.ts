import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";

import { PlatformOrganizationBillingTriggerTasker as BasePlatformOrganizationBillingTriggerTasker } from "@calcom/platform-libraries/organizations";

@Injectable()
export class PlatformBillingTriggerTaskerService extends BasePlatformOrganizationBillingTriggerTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
