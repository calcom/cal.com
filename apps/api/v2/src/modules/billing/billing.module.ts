import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingController } from "@/modules/billing/controllers/billing.controller";
import { BillingConfigService } from "@/modules/billing/services/billing.config.service";
import { BillingService } from "@/modules/billing/services/billing.service";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, MembershipsModule, OrganizationsModule],
  providers: [BillingConfigService, BillingService, BillingRepository],
  exports: [BillingService, BillingRepository],
  controllers: [BillingController],
})
export class BillingModule {}
