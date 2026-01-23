import { Module, Scope } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { PrismaPlatformBillingRepository } from "@/lib/repositories/prisma-platform-billing.repository";
import { StripeBillingProviderService } from "@/lib/services/stripe-billing-provider.service";
import { PlatformBillingSyncTaskerService } from "@/lib/services/tasker/platform-billing-sync-tasker.service";
import { PlatformBillingTaskService } from "@/lib/services/tasker/platform-billing-task.service";
import { PlatformBillingTasker } from "@/lib/services/tasker/platform-billing-tasker.service";
import { PlatformBillingTriggerTaskerService } from "@/lib/services/tasker/platform-billing-trigger-tasker.service";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";

@Module({
  imports: [PrismaModule, StripeModule, OrganizationsModule],
  providers: [
    PrismaPlatformBillingRepository,
    StripeBillingProviderService,
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    PlatformBillingTaskService,
    PlatformBillingSyncTaskerService,
    PlatformBillingTriggerTaskerService,
    PlatformBillingTasker,
  ],
  exports: [PlatformBillingTasker],
})
export class PlatformBillingTaskerModule {}
