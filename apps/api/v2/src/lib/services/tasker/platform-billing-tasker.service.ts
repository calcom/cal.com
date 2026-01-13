import { Logger } from "@/lib/logger.bridge";
import { PlatformBillingSyncTaskerService } from "@/lib/services/tasker/platform-billing-sync-tasker.service";
import { PlatformBillingTriggerTaskerService } from "@/lib/services/tasker/platform-billing-trigger-tasker.service";
import { Injectable } from "@nestjs/common";

import { PlatformOrganizationBillingTasker as BasePlatformOrganizationBillingTasker } from "@calcom/platform-libraries/organizations";

@Injectable()
export class PlatformBillingTasker extends BasePlatformOrganizationBillingTasker {
  constructor(
    syncTasker: PlatformBillingSyncTaskerService,
    asyncTasker: PlatformBillingTriggerTaskerService,
    logger: Logger
  ) {
    super({
      logger,
      asyncTasker: asyncTasker,
      syncTasker: syncTasker,
    });
  }
}
