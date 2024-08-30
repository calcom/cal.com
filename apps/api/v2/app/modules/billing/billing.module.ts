import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { BillingProcessor } from "app/modules/billing/billing.processor";
import { BillingRepository } from "app/modules/billing/billing.repository";
import { BillingController } from "app/modules/billing/controllers/billing.controller";
import { BillingConfigService } from "app/modules/billing/services/billing.config.service";
import { BillingService } from "app/modules/billing/services/billing.service";
import { MembershipsModule } from "app/modules/memberships/memberships.module";
import { OrganizationsModule } from "app/modules/organizations/organizations.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { StripeModule } from "app/modules/stripe/stripe.module";
import { UsersModule } from "app/modules/users/users.module";

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
