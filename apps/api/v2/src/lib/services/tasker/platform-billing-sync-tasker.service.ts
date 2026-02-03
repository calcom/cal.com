import { Logger } from "@/lib/logger.bridge";
import { PlatformBillingTaskService } from "@/lib/services/tasker/platform-billing-task.service";
import { Injectable } from "@nestjs/common";

import { PlatformOrganizationBillingSyncTasker as BasePlatformOrganizationBillingSyncTasker } from "@calcom/platform-libraries/organizations";

@Injectable()
export class PlatformBillingSyncTaskerService extends BasePlatformOrganizationBillingSyncTasker {
  constructor(billingTaskService: PlatformBillingTaskService, logger: Logger) {
    super({
      logger,
      billingTaskService,
    });
  }
}
