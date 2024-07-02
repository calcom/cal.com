import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/organizations-teams.controller";
import { OrganizationsUsersController } from "@/modules/organizations/controllers/organizations-users.controller";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, SchedulesModule_2024_06_11, UsersModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
  ],
  controllers: [OrganizationsTeamsController, OrganizationsSchedulesController, OrganizationsUsersController],
})
export class OrganizationsModule {}
