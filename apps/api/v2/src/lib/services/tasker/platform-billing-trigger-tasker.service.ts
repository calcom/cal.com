import { PlatformOrganizationBillingTriggerTasker as BasePlatformOrganizationBillingTriggerTasker } from "@calcom/platform-libraries/organizations";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";

@Injectable()
export class PlatformBillingTriggerTaskerService extends BasePlatformOrganizationBillingTriggerTasker {
  constructor(logger: Logger) {
    super({
      logger,
    });
  }
}
