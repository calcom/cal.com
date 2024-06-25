import { OrganizationsTeamsController } from "@/modules/organizations/controllers/organizations-teams.controller";
import { OrganizationsUsersController } from "@/modules/organizations/controllers/organizations-users.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [
    OrganizationsRepository,
    OrganizationsService,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
  ],
  controllers: [OrganizationsTeamsController, OrganizationsUsersController],
})
export class OrganizationsModule {}
