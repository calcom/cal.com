import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { BillingProcessor } from "src/modules/billing/billing.processor";
import { BillingRepository } from "src/modules/billing/billing.repository";
import { BillingController } from "src/modules/billing/controllers/billing.controller";
import { BillingConfigService } from "src/modules/billing/services/billing.config.service";
import { BillingService } from "src/modules/billing/services/billing.service";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { OrganizationsModule } from "src/modules/organizations/organizations.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { UsersModule } from "src/modules/users/users.module";

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
