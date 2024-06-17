import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsController } from "@/modules/organizations/controllers/organizations.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organizationUsers.repository";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [
    OrganizationsRepository,
    OrganizationsService,
    OrganizationUsersRepository,
    MembershipsRepository,
  ],
  exports: [OrganizationsService, OrganizationsRepository],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
