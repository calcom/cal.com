import { PlatformOrganizationBillingTaskService as BasePlatformOrganizationBillingTaskService } from "@calcom/platform-libraries/organizations";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { PrismaPlatformBillingRepository } from "@/lib/repositories/prisma-platform-billing.repository";
import { StripeBillingProviderService } from "@/lib/services/stripe-billing-provider.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

@Injectable()
export class PlatformBillingTaskService extends BasePlatformOrganizationBillingTaskService {
  constructor(
    organizationRepository: OrganizationsRepository,
    platformBillingRepository: PrismaPlatformBillingRepository,
    billingProviderService: StripeBillingProviderService,
    logger: Logger
  ) {
    super({
      logger,
      organizationRepository,
      platformBillingRepository,
      billingProviderService,
    });
  }
}
