import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsMembershipsController } from "@/modules/organizations/controllers/memberships/organizations-membership.controller";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, SchedulesModule_2024_06_11, UsersModule, RedisModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
  ],
  exports: [OrganizationsService, OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsMembershipsController,
  ],
})
export class OrganizationsModule {}
