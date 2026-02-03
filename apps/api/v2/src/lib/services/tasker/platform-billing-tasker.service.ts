import { PlatformOrganizationBillingTasker as BasePlatformOrganizationBillingTasker } from "@calcom/platform-libraries/organizations";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { PlatformBillingSyncTaskerService } from "@/lib/services/tasker/platform-billing-sync-tasker.service";
import { PlatformBillingTriggerTaskerService } from "@/lib/services/tasker/platform-billing-trigger-tasker.service";

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
