import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [OrganizationsRepository, OrganizationsService],
  exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}
