import { BillingRepository } from "@/modules/billing/billing.repository";
import { BillingService } from "@/modules/billing/billing.service";
import { BillingController } from "@/modules/billing/controllers/billing.controller";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, MembershipsModule, OrganizationsModule],
  providers: [BillingService, BillingRepository],
  exports: [BillingService, BillingRepository],
  controllers: [BillingController],
})
export class BillingModule {}
