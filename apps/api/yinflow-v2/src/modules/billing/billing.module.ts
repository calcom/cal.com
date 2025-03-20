import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { BillingProcessor } from "../billing/billing.processor";
import { BillingRepository } from "../billing/billing.repository";
import { BillingController } from "../billing/controllers/billing.controller";
import { BillingConfigService } from "../billing/services/billing.config.service";
import { BillingService } from "../billing/services/billing.service";
import { ManagedOrganizationsBillingService } from "../billing/services/managed-organizations.billing.service";
import { MembershipsModule } from "../memberships/memberships.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StripeModule } from "../stripe/stripe.module";
import { UsersModule } from "../users/users.module";

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
  providers: [
    BillingConfigService,
    BillingService,
    BillingRepository,
    BillingProcessor,
    ManagedOrganizationsBillingService,
  ],
  exports: [BillingService, BillingRepository, ManagedOrganizationsBillingService],
  controllers: [BillingController],
})
export class BillingModule {}
