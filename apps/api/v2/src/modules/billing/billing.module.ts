import { BillingProcessor } from "@/modules/billing/billing.processor";
import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingController } from "@/modules/billing/controllers/billing.controller";
import { BillingConfigService } from "@/modules/billing/services/billing.config.service";
import { BillingService } from "@/modules/billing/services/billing.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    MembershipsModule,
    OrganizationsModule,
    BullModule.registerQueue({
      name: "billing",
      limiter: {
        max: 1,
        duration: 1000,
      },
    }),
    UsersModule,
  ],
  providers: [BillingConfigService, BillingService, BillingRepository, BillingProcessor],
  exports: [BillingService, BillingRepository],
  controllers: [BillingController],
})
export class BillingModule {}
